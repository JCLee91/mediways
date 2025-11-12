import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1분

interface KieCallbackPayload {
  code: number;
  msg: string;
  data: {
    taskId: string;
    info?: {
      resultUrls: string[];
      originUrls?: string[];
      resolution?: string;
    };
    fallbackFlag?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: KieCallbackPayload = await request.json();
    const { taskId } = payload.data;

    logger.info(`[Callback] Received webhook for taskId: ${taskId}`);

    // handleCallback 실행 후 응답 (서버리스 환경에서 백그라운드 작업 보장)
    try {
      await handleCallback(payload);
    } catch (error) {
      logger.error('[Callback] Processing error:', error);
    }

    // kie.ai 요구 형식으로 응답
    return NextResponse.json({ code: 200, msg: "success" });
  } catch (error: any) {
    logger.error('[Callback] Parse error:', error);
    return NextResponse.json(
      { error: 'Invalid payload' },
      { status: 400 }
    );
  }
}

async function handleCallback(payload: KieCallbackPayload) {
  const { code, msg, data } = payload;
  const { taskId, info } = data;

  const supabase = createServiceRoleClient();

  // taskId로 작업 찾기 (단순 쿼리)
  const { data: conversion, error: findError } = await supabase
    .from('shorts_conversions')
    .select('*')
    .eq('kie_task_id', taskId)
    .single();

  if (findError || !conversion) {
    logger.error(`[Callback] Conversion not found for taskId: ${taskId}`);
    return;
  }
  const jobId = conversion.id;
  const currentSegment = conversion.current_segment || 0;
  const segments = conversion.segments || [];
  const totalSegments = segments.length;

  logger.debug(`[Callback] Processing job ${jobId}, segment ${currentSegment}/${totalSegments}`);

  // 성공 케이스
  if (code === 200 && info?.resultUrls && info.resultUrls.length > 0) {
    const videoUrl = info.resultUrls[0];

    await supabase
      .from('shorts_conversions')
      .update({
        raw_video_url: videoUrl,  // TEXT: 현재 영상 URL만 저장
        callback_received: true,
        last_callback_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.info(`[Callback] Segment ${currentSegment} completed`);

    // 다음 세그먼트 생성
    if (currentSegment < totalSegments - 1) {
      await generateNextSegment(jobId, conversion, currentSegment + 1);
    } else {
      // 모든 세그먼트 완료
      await supabase
        .from('shorts_conversions')
        .update({
          status: 'completed',
          progress: 100,
          current_step: '완료!',
          final_video_url: videoUrl,
          video_duration: totalSegments * 8,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      logger.info(`[Callback] Job ${jobId} completed`);
    }
  } else {
    // 실패 케이스
    await supabase
      .from('shorts_conversions')
      .update({
        status: 'failed',
        error_message: `영상 생성 실패 (code ${code}): ${msg}`,
        current_step: '오류 발생',
        callback_received: true,
        last_callback_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.error(`[Callback] Job ${jobId} failed: ${msg}`);
  }
}

async function generateNextSegment(
  jobId: string,
  conversion: any,
  nextSegmentIndex: number
) {
  const supabase = createServiceRoleClient();
  const segments = conversion.segments || [];
  const totalSegments = segments.length;
  const previousTaskId = conversion.kie_task_id;  // TEXT: 현재 taskId

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const callBackUrl = `${baseUrl}/api/shorts/callback`;

  // 진행률 업데이트
  const progress = 40 + Math.floor(50 * (nextSegmentIndex / totalSegments));
  await supabase
    .from('shorts_conversions')
    .update({
      current_segment: nextSegmentIndex,
      progress,
      current_step: `${nextSegmentIndex + 1}번째 클립 생성 중...`,
      status: 'generating_video',
    })
    .eq('id', jobId);

  const kieApiKey = process.env.KIE_AI_API_KEY;
  if (!kieApiKey) {
    throw new Error('KIE_AI_API_KEY가 설정되지 않았습니다.');
  }

  const videoGenerator = new KieAiVideoGeneratorService(kieApiKey);
  const nextSegment = segments[nextSegmentIndex];

  try {
    const extendTaskId = await videoGenerator.extendVideo(
      previousTaskId,
      nextSegment.videoPrompt,
      callBackUrl
    );

    // 새 taskId로 덮어쓰기
    const { error: updateError } = await supabase
      .from('shorts_conversions')
      .update({
        kie_task_id: extendTaskId,
      })
      .eq('id', jobId);

    if (updateError) {
      logger.error(`[Callback] TaskId save failed:`, updateError);
      throw new Error(`taskId 저장 실패: ${updateError.message}`);
    }

    logger.info(`[Callback] Segment ${nextSegmentIndex} task saved: ${extendTaskId}`);
  } catch (error: any) {
    logger.error(`[Callback] Segment ${nextSegmentIndex} failed:`, error.message);

    await supabase
      .from('shorts_conversions')
      .update({
        status: 'failed',
        error_message: error.message,
        current_step: '오류 발생',
      })
      .eq('id', jobId);
  }
}
