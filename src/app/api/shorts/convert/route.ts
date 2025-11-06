import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blogUrl } = await request.json();

    // URL 검증
    if (!blogUrl || typeof blogUrl !== 'string') {
      return NextResponse.json(
        { error: '블로그 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!BlogCrawlerService.isNaverBlogUrl(blogUrl)) {
      return NextResponse.json(
        { error: '올바른 네이버 블로그 포스트 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    // DB에 작업 생성
    const { data: conversion, error } = await supabase
      .from('shorts_conversions')
      .insert({
        user_id: user.id,
        blog_url: blogUrl,
        status: 'pending',
        progress: 0,
        current_step: '대기 중...',
      })
      .select()
      .single();

    if (error) {
      console.error('DB insert error:', error);
      throw new Error('작업 생성에 실패했습니다.');
    }

    // 백그라운드 작업 시작
    processConversion(conversion.id, blogUrl).catch((error) => {
      console.error(`[${conversion.id}] Background processing error:`, error);
    });

    return NextResponse.json({
      jobId: conversion.id,
      status: 'pending',
      message: '쇼츠 변환 작업이 시작되었습니다.',
    });
  } catch (error: any) {
    console.error('Shorts conversion error:', error);
    return NextResponse.json(
      { error: error.message || '쇼츠 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function processConversion(conversionId: string, blogUrl: string) {
  const supabase = await createClient();

  try {
    // 1. 크롤링 (0-20%)
    await updateProgress(conversionId, 'crawling', 5, '블로그 콘텐츠를 가져오는 중...');

    const crawlResult = await BlogCrawlerService.crawlNaverBlog(blogUrl);

    await supabase
      .from('shorts_conversions')
      .update({
        blog_title: crawlResult.title,
        blog_content: crawlResult.content,
        blog_images: crawlResult.images,
      })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'crawling', 20, '블로그 콘텐츠 가져오기 완료');

    // 2. AI 요약 (20-40%)
    await updateProgress(conversionId, 'summarizing', 25, 'AI가 스크립트를 작성하는 중...');

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
      .eq('id', conversionId);

    await updateProgress(conversionId, 'summarizing', 40, 'AI 스크립트 작성 완료');

    // 3. 영상 생성 (40-90%)
    await updateProgress(
      conversionId,
      'generating_video',
      45,
      '영상을 생성하는 중... (약 2-3분 소요)'
    );

    const kieApiKey = process.env.KIE_AI_API_KEY;
    if (!kieApiKey) {
      throw new Error('KIE_AI_API_KEY가 설정되지 않았습니다.');
    }

    const videoGenerator = new KieAiVideoGeneratorService(kieApiKey);

    // 첫 번째 세그먼트로 영상 생성 (MVP)
    const firstSegment = script.segments[0];
    const taskId = await videoGenerator.generateVideo({
      prompt: firstSegment.videoPrompt,
      aspectRatio: '9:16',
      duration: 8,
    });

    await supabase
      .from('shorts_conversions')
      .update({ kie_task_id: taskId })
      .eq('id', conversionId);

    await updateProgress(
      conversionId,
      'generating_video',
      60,
      '영상 생성 중... 조금만 기다려주세요'
    );

    // 폴링으로 영상 완성 대기
    const rawVideoUrl = await videoGenerator.pollTaskStatus(taskId);

    await supabase
      .from('shorts_conversions')
      .update({
        raw_video_url: rawVideoUrl,
        final_video_url: rawVideoUrl, // 자막 없이 임시로 원본 사용
        video_duration: 8,
      })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'generating_video', 90, '영상 생성 완료');

    // 4. 완료 (100%)
    await supabase
      .from('shorts_conversions')
      .update({
        status: 'completed',
        progress: 100,
        current_step: '완료!',
        completed_at: new Date().toISOString(),
      })
      .eq('id', conversionId);

    console.log(`[${conversionId}] Conversion completed successfully`);
  } catch (error: any) {
    console.error(`[${conversionId}] Processing error:`, error);

    await supabase
      .from('shorts_conversions')
      .update({
        status: 'failed',
        error_message: error.message,
        current_step: '오류 발생',
      })
      .eq('id', conversionId);
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
