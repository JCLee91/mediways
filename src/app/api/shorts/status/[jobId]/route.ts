import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

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
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 });
    }

    // kie.ai에서 실시간 상태 확인
    if (conversion.kie_task_id && conversion.status === 'generating_video') {
      const kieApiKey = process.env.KIE_AI_API_KEY;
      if (kieApiKey) {
        try {
          const response = await axios.get(
            `https://api.kie.ai/api/v1/veo/record-info?taskId=${conversion.kie_task_id}`,
            {
              headers: { Authorization: `Bearer ${kieApiKey}` },
              timeout: 5000,
            }
          );

          const { successFlag, resultUrls } = response.data.data || response.data;

          // 완료
          if (successFlag === 1 && resultUrls) {
            const urls = JSON.parse(resultUrls);
            const videoUrl = urls[0];

            await supabase
              .from('shorts_conversions')
              .update({
                status: 'completed',
                progress: 100,
                current_step: '완료!',
                final_video_url: videoUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'completed',
              progress: 100,
              currentStep: '완료!',
              result: {
                videoUrl,
                duration: conversion.video_duration,
                title: conversion.blog_title,
                summary: conversion.summary,
              },
            });
          }

          // 실패
          if (successFlag === 2 || successFlag === 3) {
            await supabase
              .from('shorts_conversions')
              .update({
                status: 'failed',
                error_message: '영상 생성 실패',
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'failed',
              progress: 0,
              currentStep: '실패',
              error: '영상 생성 실패',
            });
          }
        } catch {
          // kie.ai 오류는 무시하고 DB 상태 반환
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
