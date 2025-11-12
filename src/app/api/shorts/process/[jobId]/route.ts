import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1분 (영상 생성 요청만)

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

    if (conversion.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리 중이거나 완료된 작업입니다.' },
        { status: 400 }
      );
    }

    const blogUrl = conversion.blog_url;

    // 1. 크롤링 (0-20%)
    await updateProgress(jobId, 'crawling', 5, '블로그 콘텐츠를 가져오는 중...');

    const crawlResult = await BlogCrawlerService.crawlNaverBlog(blogUrl);

    await supabase
      .from('shorts_conversions')
      .update({
        blog_title: crawlResult.title,
        blog_content: crawlResult.content,
        blog_images: crawlResult.images,
      })
      .eq('id', jobId);

    await updateProgress(jobId, 'crawling', 20, '블로그 콘텐츠 가져오기 완료');

    // 2. AI 요약 (20-40%)
    await updateProgress(jobId, 'summarizing', 25, 'AI가 스크립트를 작성하는 중...');

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const scriptGenerator = new ShortsScriptGeneratorService(openaiApiKey);
    const script = await scriptGenerator.generateScript(
      crawlResult.title,
      crawlResult.content
    );

    await supabase
      .from('shorts_conversions')
      .update({
        summary: script.summary,
        segments: script.segments,
      })
      .eq('id', jobId);

    await updateProgress(jobId, 'summarizing', 40, 'AI 스크립트 작성 완료');

    // 3. 영상 생성 요청만 (polling은 status API에서)
    await updateProgress(jobId, 'generating_video', 45, '영상 생성 중...');

    const kieApiKey = process.env.KIE_AI_API_KEY;
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY가 설정되지 않았습니다.');
    }

    const videoGenerator = new KieAiVideoGeneratorService(kieApiKey);
    const segments = script.segments;

    // 첫 번째 영상 요청
    const task1 = await videoGenerator.generateVideo({
      prompt: segments[0].videoPrompt,
      aspectRatio: '9:16',
      duration: 8,
    });

    // 두 번째 영상 요청 (extend)
    const task2 = await videoGenerator.extendVideo(task1, segments[1].videoPrompt);

    // 세 번째 영상 요청 (extend)
    const task3 = await videoGenerator.extendVideo(task2, segments[2].videoPrompt);

    // taskId 저장 (마지막 task만 - extend 체인의 최종 결과)
    await supabase
      .from('shorts_conversions')
      .update({
        kie_task_id: task3,
        video_duration: segments.length * 8,
      })
      .eq('id', jobId);

    logger.info(`[${jobId}] Video generation requested: ${task3}`);

    return NextResponse.json({
      success: true,
      message: '영상 생성이 시작되었습니다.',
    });
  } catch (error: any) {
    console.error(`[${jobId}] Processing error:`, error);

    const supabase = await createClient();
    await supabase
      .from('shorts_conversions')
      .update({
        status: 'failed',
        error_message: error.message,
        current_step: '오류 발생',
      })
      .eq('id', jobId);

    return NextResponse.json(
      { error: error.message || '쇼츠 변환 중 오류가 발생했습니다.' },
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
