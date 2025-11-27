import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { GrokImagineService } from '@/lib/services/grokImagineService';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 (Vercel Pro 최대치)

// @ts-ignore
import { unstable_after as after } from 'next/server';

export async function POST(
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

    // 작업 조회
    const { data: conversion, error } = await supabase
      .from('shorts_conversions')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversion) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 처리 중이거나 완료된 작업인지 확인 (중복 호출 방지)
    if (conversion.status !== 'pending') {
      return NextResponse.json(
        {
          error: '이미 처리 중이거나 완료된 작업입니다.',
          currentStatus: conversion.status
        },
        { status: 409 }
      );
    }

    const blogUrl = conversion.blog_url;
    console.log(`[Process] Job ${jobId}: Starting background processing for ${blogUrl}`);

    // 백그라운드 작업 시작
    
    // unstable_after가 없는 경우를 대비한 호환성 처리
    const safeAfter = (task: () => Promise<void>) => {
      // @ts-ignore
      if (typeof after === 'function') {
        after(task);
      } else {
        // Next.js 버전에 따라 after가 없을 수 있음. 이 경우 그냥 실행 (응답 지연 발생 가능)
        console.warn('[Process] unstable_after is not available. Running task directly.');
        task().catch(err => console.error('Background task error:', err));
      }
    };

    safeAfter(async () => {
      try {
        console.log(`[Process] Job ${jobId}: Background task started`);

        // 1. 크롤링 (0-20%)
        await updateProgress(jobId, 'crawling', 5, '블로그 내용을 분석하고 있습니다...');

        const crawlResult = await BlogCrawlerService.crawlNaverBlog(blogUrl);
        console.log(`[Process] Job ${jobId}: Crawl complete. Title: ${crawlResult.title}, Length: ${crawlResult.content.length}`);

        // 본문 추출 실패 또는 Fallback 메시지 감지 시 에러 처리
        if (crawlResult.content.length < 200 || crawlResult.content.includes('본문을 찾지 못했습니다')) {
          throw new Error('블로그 본문을 가져오지 못했습니다. (네이버 블로그 접근 제한 또는 비공개 글일 수 있습니다)');
        }

        await supabase
          .from('shorts_conversions')
          .update({
            blog_title: crawlResult.title,
            blog_content: crawlResult.content,
            blog_images: crawlResult.images,
          })
          .eq('id', jobId);

        await updateProgress(jobId, 'crawling', 20, '블로그 분석이 완료되었습니다.');

        // 2. AI 3단계 생성 (20-40%)
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
        }

        const scriptGenerator = new ShortsScriptGeneratorService(openaiApiKey);

        // 진행 상황 콜백으로 3단계 진행률 표시
        await updateProgress(jobId, 'summarizing', 22, '1/3 단계: 쇼츠 기획 중...');

        const script = await scriptGenerator.generateScript(
          crawlResult.title,
          crawlResult.content,
          // 진행 상황 콜백
          async (stage: number) => {
            if (stage === 1) {
              await updateProgress(jobId, 'summarizing', 28, '2/3 단계: 대본 작성 중...');
            } else if (stage === 2) {
              await updateProgress(jobId, 'summarizing', 34, '3/3 단계: 영상 프롬프트 생성 중...');
            }
          }
        );
        console.log(`[Process] Job ${jobId}: Script generated. Segments: ${script.segments.length}`);

        await supabase
          .from('shorts_conversions')
          .update({
            shorts_title: script.shortsTitle,
            summary: script.summary,
            segments: script.segments,
          })
          .eq('id', jobId);

        await updateProgress(jobId, 'summarizing', 40, '대본 및 영상 프롬프트 생성 완료!');

        // 3. 영상 생성 요청 (3개 개별 생성)
        await updateProgress(jobId, 'generating_video', 45, 'AI 영상 생성을 시작합니다...');

        const kieApiKey = process.env.KIE_AI_API_KEY;
        if (!kieApiKey) {
          throw new Error('KIE_AI_API_KEY가 설정되지 않았습니다.');
        }

        const grokService = new GrokImagineService(kieApiKey);
        const segments = script.segments;

        // 3개 영상 개별 생성 (병렬 요청으로 속도 개선)
        const taskPromises = segments.map(async (segment) => {
          console.log(`[Process] Job ${jobId}: Requesting video for segment... Prompt: ${segment.videoPrompt.substring(0, 50)}...`);
          return grokService.generateVideo({
            prompt: segment.videoPrompt,
            aspectRatio: '9:16',
            mode: 'normal',
          });
        });

        const taskIds = await Promise.all(taskPromises);

        // taskIds 저장 (JSON 문자열로)
        await supabase
          .from('shorts_conversions')
          .update({
            kie_task_id: JSON.stringify(taskIds),  // TEXT 컬럼에 JSON 문자열 저장
            video_duration: segments.length * 8,
          })
          .eq('id', jobId);

        logger.info(`[${jobId}] Video tasks created: ${taskIds.join(', ')}`);
        console.log(`[Process] Job ${jobId}: Background task completed successfully`);

      } catch (error: any) {
        console.error(`[${jobId}] Background processing error:`, error);

        const supabase = await createClient();
        await supabase
          .from('shorts_conversions')
          .update({
            status: 'failed',
            error_message: error.message,
            current_step: '오류 발생',
          })
          .eq('id', jobId);
      }
    });

    // 클라이언트에게는 즉시 성공 응답 반환
    return NextResponse.json({
      success: true,
      message: '영상 생성이 시작되었습니다 (백그라운드 처리).',
    });

  } catch (error: any) {
    console.error(`[${jobId}] Request error:`, error);
    return NextResponse.json(
      { error: error.message || '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function updateProgress(
  conversionId: string,
  status: string,
  progress: number,
  currentStep: string
) {
  const supabase = await createClient();
  await supabase
    .from('shorts_conversions')
    .update({
      status,
      progress,
      current_step: currentStep,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversionId);
}
