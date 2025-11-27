import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 300;

// FFmpeg 초기화 함수
const getFFmpeg = async () => {
  const fluentFfmpeg = await import('fluent-ffmpeg');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const ffmpeg = fluentFfmpeg.default || fluentFfmpeg;
  
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
  
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  console.log(`[FFmpeg] Path: ${ffmpegInstaller.path}`);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  
  return ffmpeg;
};

async function mergeVideos(videoUrls: string[]): Promise<string> {
  console.log(`[Merge] Starting merge for ${videoUrls.length} videos`);
  const ffmpeg = await getFFmpeg();
  
  const tempDir = path.join(os.tmpdir(), `shorts-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 다운로드
    const inputPaths = await Promise.all(
      videoUrls.map(async (url, i) => {
        const outputPath = path.join(tempDir, `part_${i}.mp4`);
        console.log(`[Merge] Downloading video ${i}: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fs.writeFile(outputPath, Buffer.from(response.data));
        return outputPath;
      })
    );

    // concat 리스트 파일 생성
    const listFilePath = path.join(tempDir, 'list.txt');
    const fileContent = inputPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(listFilePath, fileContent);

    // 병합 (Concat 방식)
    const outputPath = path.join(tempDir, 'merged.mp4');
    console.log(`[Merge] Merging videos using concat to ${outputPath}`);
    
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy']) // 재인코딩 없이 복사 (매우 빠름)
        .save(outputPath)
        .on('start', (cmd: string) => console.log('[Merge] FFmpeg command:', cmd))
        .on('end', () => {
          console.log('[Merge] FFmpeg finished');
          resolve(null);
        })
        .on('error', (err: any) => {
          console.error('[Merge] FFmpeg error:', err);
          reject(err);
        });
    });

    // Base64 인코딩
    console.log('[Merge] Reading merged file');
    const buffer = await fs.readFile(outputPath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64}`;
    
    return dataUrl;
  } catch (error) {
    console.error('[Merge] Error during merge process:', error);
    throw error;
  } finally {
    // 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('[Merge] Failed to cleanup temp dir:', e);
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversion, error } = await supabase
      .from('shorts_conversions')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversion) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이미 완료된 작업이면 바로 반환
    if (conversion.status === 'completed') {
      return NextResponse.json({
        jobId: conversion.id,
        status: 'completed',
        progress: 100,
        currentStep: '완료!',
        result: {
          videoUrl: conversion.final_video_url,
          duration: conversion.video_duration,
          title: conversion.shorts_title || conversion.blog_title,
          summary: conversion.summary,
          segments: conversion.segments,
        },
      });
    }

    // kie.ai에서 3개 영상 상태 확인
    if (conversion.kie_task_id && conversion.status === 'generating_video') {
      const kieApiKey = process.env.KIE_AI_API_KEY;
      if (kieApiKey) {
        try {
          let taskIds;
          try {
            taskIds = JSON.parse(conversion.kie_task_id);
          } catch (e) {
             // kie_task_id가 JSON이 아니라 단일 문자열일 경우 배열로 처리 (하위 호환)
             taskIds = [conversion.kie_task_id];
          }
          
          if (!Array.isArray(taskIds)) {
            taskIds = [taskIds];
          }

          const cachedUrls = conversion.video_urls || {};
          const videoUrls: string[] = [];
          let completedCount = 0;

          console.log(`[Status] Checking status for Job ${jobId}. Total tasks: ${taskIds.length}`);

          // 각 영상 상태 확인 (캐싱된 것은 kie.ai 호출 안 함)
          for (let i = 0; i < taskIds.length; i++) {
            const taskId = taskIds[i];

            // 캐싱된 URL이 있으면 재사용
            if (cachedUrls[i]) {
              videoUrls[i] = cachedUrls[i];
              completedCount++;
              // console.log(`[Status] Task ${i} (${taskId}) already cached: ${cachedUrls[i].substring(0, 30)}...`);
              continue;
            }

            // 미완료 영상만 kie.ai 조회 (Grok API)
            console.log(`[Status] Fetching info for task ${taskId}...`);
            const response = await axios.get(
              `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
              {
                headers: { Authorization: `Bearer ${kieApiKey}` },
                timeout: 10000, // 타임아웃 증가
              }
            );

            const { code, data } = response.data;
            // console.log(`[Status] API Response for ${taskId}:`, JSON.stringify(data).substring(0, 200) + '...');

            if (code === 200 && data) {
              if (data.state === 'success') {
                let resultUrls;
                try {
                  // resultJson이 문자열이면 파싱, 객체면 그대로 사용
                  const resultJson = typeof data.resultJson === 'string' 
                    ? JSON.parse(data.resultJson) 
                    : data.resultJson;
                  
                  resultUrls = resultJson?.resultUrls;
                } catch (e) {
                  console.error(`[Status] Failed to parse resultJson for task ${taskId}:`, e);
                }

                if (resultUrls && Array.isArray(resultUrls) && resultUrls.length > 0) {
                  videoUrls[i] = resultUrls[0];
                  cachedUrls[i] = resultUrls[0];
                  completedCount++;
                  console.log(`[Status] Task ${taskId} completed. URL: ${resultUrls[0].substring(0, 50)}...`);

                  // DB에 캐싱 (하나라도 완료되면 저장)
                  await supabase
                    .from('shorts_conversions')
                    .update({ video_urls: cachedUrls })
                    .eq('id', jobId);
                } else {
                  console.warn(`[Status] Task ${taskId} success but no URLs found.`);
                }
              } else if (data.state === 'failed') {
                const failMsg = data.failMsg || 'Unknown error';
                console.error(`[Status] Task ${taskId} failed: ${failMsg}`);
                throw new Error(`영상 생성 실패: ${failMsg}`);
              } else {
                console.log(`[Status] Task ${taskId} is still ${data.state}`);
              }
            } else {
               console.error(`[Status] Invalid API response code ${code}`);
            }
          }

          const progress = 45 + Math.floor(55 * (completedCount / taskIds.length));
          console.log(`[Status] Progress: ${progress}% (${completedCount}/${taskIds.length})`);

          // 모두 완료 - 병합 시작
          if (completedCount === taskIds.length) {
            console.log('[Status] All tasks completed. Starting merge process...');
            
            await supabase
              .from('shorts_conversions')
              .update({
                progress: 95,
                current_step: '생성된 영상을 하나로 합치는 중...',
              })
              .eq('id', jobId);

            // FFmpeg 병합
            const mergedUrl = await mergeVideos(videoUrls);
            console.log('[Status] Merge completed. Updating DB...');

            await supabase
              .from('shorts_conversions')
              .update({
                status: 'completed',
                progress: 100,
                current_step: '영상 생성이 완료되었습니다!',
                final_video_url: mergedUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'completed',
              progress: 100,
              currentStep: '영상 생성이 완료되었습니다!',
              result: {
                videoUrl: mergedUrl,
                duration: conversion.video_duration,
                title: conversion.shorts_title || conversion.blog_title,
                summary: conversion.summary,
                segments: conversion.segments,
              },
            });
          }

          // 진행 중
          return NextResponse.json({
            jobId,
            status: 'generating_video',
            progress,
            currentStep: `AI 영상 생성 중... (${completedCount}/${taskIds.length}컷 완료)`,
          });
        } catch (err: any) {
          console.error('[Status] Fatal error in status check:', err);
          await supabase
            .from('shorts_conversions')
            .update({
              status: 'failed',
              error_message: err.message,
            })
            .eq('id', jobId);

          return NextResponse.json({
            jobId,
            status: 'failed',
            progress: 0,
            error: err.message,
          });
        }
      }
    }

    // DB 상태 반환 (진행 중이 아닐 때)
    return NextResponse.json({
      jobId: conversion.id,
      status: conversion.status,
      progress: conversion.progress,
      currentStep: conversion.current_step,
      result:
        conversion.status === 'completed'
          ? {
              videoUrl: conversion.final_video_url,
              duration: conversion.video_duration,
              title: conversion.shorts_title || conversion.blog_title,
              summary: conversion.summary,
              segments: conversion.segments,
            }
          : null,
      error: conversion.error_message,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: '상태 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
