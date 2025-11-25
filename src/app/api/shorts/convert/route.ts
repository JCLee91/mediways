import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';

export const runtime = 'nodejs';

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

    if (!blogUrl || typeof blogUrl !== 'string') {
      return NextResponse.json(
        { error: '블로그 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 네이버 블로그 URL 형식 검증
    const isNaverBlog = /^https?:\/\/(m\.)?blog\.naver\.com\//i.test(blogUrl);
    if (!isNaverBlog) {
      return NextResponse.json(
        { error: '네이버 블로그 URL만 지원합니다.' },
        { status: 400 }
      );
    }

    // 이미 진행 중인 작업이 있는지 확인 (중복 생성 방지)
    const { data: existingJob } = await supabase
      .from('shorts_conversions')
      .select('id, status, blog_url')
      .eq('user_id', user.id)
      .in('status', ['pending', 'crawling', 'summarizing', 'generating_video'])
      .single();

    if (existingJob) {
      return NextResponse.json(
        {
          error: '이미 진행 중인 작업이 있습니다. 완료 후 다시 시도해주세요.',
          existingJobId: existingJob.id,
          existingStatus: existingJob.status
        },
        { status: 409 }
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
      throw new Error(`작업 생성에 실패했습니다: ${error.message || JSON.stringify(error)}`);
    }

    // 작업 ID만 반환, 실제 처리는 클라이언트가 /api/shorts/process/[jobId]를 호출
    return NextResponse.json({
      jobId: conversion.id,
      status: 'pending',
      message: '쇼츠 변환 작업이 생성되었습니다.',
    });
  } catch (error: any) {
    console.error('Shorts conversion error:', error);
    return NextResponse.json(
      { error: error.message || '쇼츠 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
