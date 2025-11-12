import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1분 (Callback 방식이므로 짧게)

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

    // 3. 영상 생성 - Callback 방식으로 첫 번째 세그먼트만 시작 (40-45%)
    await updateProgress(
      jobId,
      'generating_video',
      45,
      '첫 번째 클립 생성 요청 중...'
    );

    const kieApiKey = process.env.KIE_AI_API_KEY;
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY가 설정되지 않았습니다.');
    }

    const videoGenerator = new KieAiVideoGeneratorService(kieApiKey);
    const segments = script.segments;
    const totalSegments = segments.length;

    // Callback URL 설정
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const callBackUrl = `${baseUrl}/api/shorts/callback`;

    logger.debug(`[${jobId}] Starting first video generation`, {
      callBackUrl,
      totalSegments,
      promptPreview: segments[0].videoPrompt.slice(0, 50)
    });

    // 첫 번째 세그먼트 생성 (Callback 방식)
    const firstTaskId = await videoGenerator.generateVideo({
      prompt: segments[0].videoPrompt,
      aspectRatio: '9:16',
      duration: 8,
      callBackUrl,
    });

    // taskId 저장 및 current_segment 초기화
    const { error: saveError } = await supabase
      .from('shorts_conversions')
      .update({
        kie_task_id: firstTaskId,
        current_segment: 0,
        video_duration: totalSegments * 8,
      })
      .eq('id', jobId);

    if (saveError) {
      logger.error(`[${jobId}] DB save failed:`, saveError);
      throw new Error(`taskId 저장 실패: ${saveError.message}`);
    }

    await updateProgress(
      jobId,
      'generating_video',
      50,
      '첫 번째 클립 생성 중... (완료 시 자동으로 다음 클립 생성)'
    );

    logger.info(`[${jobId}] TaskId saved to DB: ${firstTaskId}`);

    return NextResponse.json({
      success: true,
      message: '쇼츠 변환이 시작되었습니다. 완료되면 자동으로 알려드립니다.',
      taskId: firstTaskId,
      jobId: jobId,
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
