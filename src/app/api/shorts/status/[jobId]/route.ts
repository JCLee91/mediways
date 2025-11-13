import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function mergeVideos(videoUrls: string[]): Promise<string> {
  const ffmpeg = (await import('fluent-ffmpeg')).default;
  const { path: ffmpegPath } = await import('@ffmpeg-installer/ffmpeg');

  ffmpeg.setFfmpegPath(ffmpegPath);

  const tempDir = path.join(os.tmpdir(), `shorts-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  // 다운로드
  const inputPaths = await Promise.all(
    videoUrls.map(async (url, i) => {
      const outputPath = path.join(tempDir, `${i}.mp4`);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      await fs.writeFile(outputPath, Buffer.from(response.data));
      return outputPath;
    })
  );

  // 병합
  const outputPath = path.join(tempDir, 'merged.mp4');
  await new Promise((resolve, reject) => {
    let command = ffmpeg();
    inputPaths.forEach(p => command.input(p));
    command
      .on('end', resolve)
      .on('error', reject)
      .mergeToFile(outputPath, tempDir);
  });

  // Base64 인코딩
  const buffer = await fs.readFile(outputPath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:video/mp4;base64,${base64}`;

  // 정리
  await fs.rm(tempDir, { recursive: true, force: true });

  return dataUrl;
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

    // kie.ai에서 3개 영상 상태 확인
    if (conversion.kie_task_id && conversion.status === 'generating_video') {
      const kieApiKey = process.env.KIE_AI_API_KEY;
      if (kieApiKey) {
        try {
          const taskIds = JSON.parse(conversion.kie_task_id);
          const cachedUrls = conversion.video_urls || {};
          const videoUrls: string[] = [];
          let completedCount = 0;

          // 각 영상 상태 확인 (캐싱된 것은 kie.ai 호출 안 함)
          for (let i = 0; i < taskIds.length; i++) {
            const taskId = taskIds[i];

            // 캐싱된 URL이 있으면 재사용
            if (cachedUrls[i]) {
              videoUrls[i] = cachedUrls[i];
              completedCount++;
              continue;
            }

            // 미완료 영상만 kie.ai 조회
            const response = await axios.get(
              `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`,
              {
                headers: { Authorization: `Bearer ${kieApiKey}` },
                timeout: 5000,
              }
            );

            const { successFlag, resultUrls } = response.data.data || response.data;

            if (successFlag === 1 && resultUrls) {
              const urls = JSON.parse(resultUrls);
              videoUrls[i] = urls[0];
              cachedUrls[i] = urls[0];
              completedCount++;

              // DB에 캐싱
              await supabase
                .from('shorts_conversions')
                .update({ video_urls: cachedUrls })
                .eq('id', jobId);
            } else if (successFlag === 2 || successFlag === 3) {
              throw new Error('영상 생성 실패');
            }
          }

          const progress = 45 + Math.floor(55 * (completedCount / taskIds.length));

          // 모두 완료 - 병합 시작
          if (completedCount === taskIds.length) {
            await supabase
              .from('shorts_conversions')
              .update({
                progress: 95,
                current_step: '영상 병합 중...',
              })
              .eq('id', jobId);

            // FFmpeg 병합
            const mergedUrl = await mergeVideos(videoUrls);

            await supabase
              .from('shorts_conversions')
              .update({
                status: 'completed',
                progress: 100,
                current_step: '완료!',
                final_video_url: mergedUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'completed',
              progress: 100,
              currentStep: '완료!',
              result: {
                videoUrl: mergedUrl,
                duration: conversion.video_duration,
                title: conversion.blog_title,
                summary: conversion.summary,
              },
            });
          }

          // 진행 중
          return NextResponse.json({
            jobId,
            status: 'generating_video',
            progress,
            currentStep: `영상 생성 중... (${completedCount}/${taskIds.length})`,
          });
        } catch (err: any) {
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

    // DB 상태 반환
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
              title: conversion.blog_title,
              summary: conversion.summary,
            }
          : null,
      error: conversion.error_message,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: '상태 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
