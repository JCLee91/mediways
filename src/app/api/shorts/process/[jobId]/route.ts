import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';

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

    // Callback URL 설정 (Production 필수)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      throw new Error(
        'NEXT_PUBLIC_BASE_URL 환경변수가 설정되지 않았습니다. ' +
        'kie.ai Callback을 받으려면 공개 URL이 필요합니다. ' +
        'Vercel/배포 환경에서 설정해주세요.'
      );
    }

    // localhost는 kie.ai에서 접근 불가
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.warn(
        '[Warning] BASE_URL이 localhost입니다. ' +
        'kie.ai Callback이 도달하지 못합니다. ' +
        'ngrok 또는 배포 URL을 사용하세요.'
      );
    }

    const callBackUrl = `${baseUrl}/api/shorts/callback`;

    // 첫 번째 세그먼트 생성 (Callback 방식)
    const firstTaskId = await videoGenerator.generateVideo({
      prompt: segments[0].videoPrompt,
      aspectRatio: '9:16',
      duration: 8,
      callBackUrl, // Callback URL 추가
    });

    // taskId 저장 및 current_segment 초기화 (JSONB 배열)
    await supabase
      .from('shorts_conversions')
      .update({
        kie_task_id: [firstTaskId], // JSONB 배열로 직접 저장
        current_segment: 0,
        video_duration: totalSegments * 8,
      })
      .eq('id', jobId);

    await updateProgress(
      jobId,
      'generating_video',
      50,
      '첫 번째 클립 생성 중... (완료 시 자동으로 다음 클립 생성)'
    );

    console.log(`[Shorts] First segment task created: ${firstTaskId}`);
    console.log(`[Shorts] Callback will handle remaining ${totalSegments - 1} segments`);

    // Callback이 나머지 처리하므로 여기서 즉시 응답
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
