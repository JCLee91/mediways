import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

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
              segments: conversion.segments,
            }
          : null,
      error: conversion.error_message,
      createdAt: conversion.created_at,
      updatedAt: conversion.updated_at,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
