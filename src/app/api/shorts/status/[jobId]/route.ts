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

    // kie.ai에서 3개 영상 상태 확인
    if (conversion.kie_task_id && conversion.status === 'generating_video') {
      const kieApiKey = process.env.KIE_AI_API_KEY;
      if (kieApiKey) {
        try {
          const taskIds = JSON.parse(conversion.kie_task_id);
          let completedCount = 0;
          let finalVideoUrl = '';

          // 3개 영상 상태 확인
          for (const taskId of taskIds) {
            const response = await axios.get(
              `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`,
              {
                headers: { Authorization: `Bearer ${kieApiKey}` },
                timeout: 5000,
              }
            );

            const { successFlag, resultUrls } = response.data.data || response.data;

            if (successFlag === 1 && resultUrls) {
              completedCount++;
              if (!finalVideoUrl) {
                const urls = JSON.parse(resultUrls);
                finalVideoUrl = urls[0];
              }
            }

            if (successFlag === 2 || successFlag === 3) {
              throw new Error('영상 생성 실패');
            }
          }

          // 진행률 계산
          const progress = 45 + Math.floor(55 * (completedCount / taskIds.length));

          // 모두 완료
          if (completedCount === taskIds.length) {
            await supabase
              .from('shorts_conversions')
              .update({
                status: 'completed',
                progress: 100,
                current_step: '완료!',
                final_video_url: finalVideoUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'completed',
              progress: 100,
              currentStep: '완료!',
              result: {
                videoUrl: finalVideoUrl,
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
