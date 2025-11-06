export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { blogAnalysisService } from "@/lib/services/blogAnalysisService";
import { DashboardApiResponse, UserStats } from "@/types/api";
import { getKstDayStartUtc, addDays, toKstDateString } from "@/lib/kst-utils";
import { isNewUser } from "@/lib/dummyData";

// 사용자 통계 계산 함수
async function getUserStats(supabase: any, userId: string): Promise<UserStats> {
  const now = new Date();
  const kstTodayStartUtc = getKstDayStartUtc(now);
  const kstTomorrowStartUtc = addDays(kstTodayStartUtc, 1);
  const last7StartUtc = addDays(kstTodayStartUtc, -6);
  const last30StartUtc = addDays(kstTodayStartUtc, -29);

  // 병렬로 모든 통계 쿼리 실행 (부분 실패 허용)
  const results = await Promise.allSettled([
    // 총 생성 수
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // 오늘 생성 수
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', kstTodayStartUtc.toISOString())
      .lt('created_at', kstTomorrowStartUtc.toISOString()),
    
    // 최근 7일 생성 수
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', last7StartUtc.toISOString())
      .lt('created_at', kstTomorrowStartUtc.toISOString()),
    
    // 최근 30일 생성 수
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', last30StartUtc.toISOString())
      .lt('created_at', kstTomorrowStartUtc.toISOString()),
    
    // 타입 분포
    supabase
      .from('generations')
      .select('type')
      .eq('user_id', userId),
    
    // 최근 생성 목록
    supabase
      .from('generations')
      .select('id, type, sub_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    
    // 일별 통계용 데이터
    supabase
      .from('generations')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', last7StartUtc.toISOString())
      .lt('created_at', kstTomorrowStartUtc.toISOString())
  ]);

  // 결과 추출 (실패한 것은 기본값 사용)
  const totalCount = results[0].status === 'fulfilled' ? results[0].value.count : 0;
  const todayCount = results[1].status === 'fulfilled' ? results[1].value.count : 0;
  const weekCount = results[2].status === 'fulfilled' ? results[2].value.count : 0;
  const monthCount = results[3].status === 'fulfilled' ? results[3].value.count : 0;
  const typeData = results[4].status === 'fulfilled' ? results[4].value.data : [];
  const recentData = results[5].status === 'fulfilled' ? results[5].value.data : [];
  const dailyData = results[6].status === 'fulfilled' ? results[6].value.data : [];

  // 실패한 쿼리 로깅
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`getUserStats query ${index} failed:`, result.reason);
    }
  });

  // 타입 분포 계산
  const typeDistribution = {
    blog: 0,
    sns: 0,
    youtube: 0,
    copywriting: 0
  };

  typeData?.forEach((item: { type: string }) => {
    if (item.type && item.type in typeDistribution) {
      typeDistribution[item.type as keyof typeof typeDistribution]++;
    }
  });

  // 일별 통계 계산
  const dailyStats: Array<{ date: string; count: number }> = [];
  const dailyCounts: { [key: string]: number } = {};

  // 최근 7일 초기화
  for (let i = 6; i >= 0; i--) {
    const dayUtc = addDays(kstTodayStartUtc, -i);
    const dateStr = toKstDateString(dayUtc);
    dailyCounts[dateStr] = 0;
  }

  // 실제 생성 수 카운트
  dailyData?.forEach((item: { created_at: string }) => {
    if (item.created_at) {
      const createdAtUtc = new Date(item.created_at);
      const dateStr = toKstDateString(createdAtUtc);
      if (Object.prototype.hasOwnProperty.call(dailyCounts, dateStr)) {
        dailyCounts[dateStr]++;
      }
    }
  });

  // 배열로 변환
  Object.entries(dailyCounts).forEach(([date, count]) => {
    dailyStats.push({ date, count });
  });

  return {
    totalGenerations: totalCount ?? 0,
    todayGenerations: todayCount ?? 0,
    thisWeekGenerations: weekCount ?? 0,
    thisMonthGenerations: monthCount ?? 0,
    typeDistribution,
    recentGenerations: recentData || [],
    dailyStats: dailyStats.sort((a, b) => a.date.localeCompare(b.date))
  };
}


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      const guestStats: UserStats = {
        totalGenerations: 0,
        todayGenerations: 0,
        thisWeekGenerations: 0,
        thisMonthGenerations: 0,
        typeDistribution: {
          blog: 0,
          sns: 0,
          youtube: 0,
          copywriting: 0
        },
        recentGenerations: [],
        dailyStats: []
      };

      const guestResponse: DashboardApiResponse = {
        success: true,
        guest: true,
        data: {
          user: {
            id: 'guest',
            email: ''
          },
          userStats: guestStats
        },
        warnings: [
          '샘플 데이터를 표시하고 있습니다. 실제 데이터를 보려면 블로그를 연결해주세요.'
        ]
      };

      return NextResponse.json(guestResponse, {
        headers: {
          'Cache-Control': 'public, max-age=30'
        }
      });
    }

    const blogId = user.user_metadata?.blog_id;
    
    // 병렬로 사용자 통계와 블로그 분석 실행 (부분 실패 허용)
    const [userStatsResult, blogAnalysisResult] = await Promise.allSettled([
      getUserStats(supabase, user.id),
      blogId ? blogAnalysisService.analyzeBlog(user.id, blogId) : Promise.resolve(null)
    ]);

    const userStats = userStatsResult.status === 'fulfilled' ? userStatsResult.value : null;
    const blogAnalysis = blogAnalysisResult.status === 'fulfilled' ? blogAnalysisResult.value : null;

    // 신규 사용자 체크 - 더미 데이터 제공 여부 결정
    const shouldProvideDummyData = isNewUser(userStats) && !blogAnalysis;

    // 경고 메시지 수집
    const warnings: string[] = [];
    if (userStatsResult.status === 'rejected') {
      console.error('User stats failed:', userStatsResult.reason);
      warnings.push('사용자 통계 데이터를 불러올 수 없습니다');
    }
    if (blogAnalysisResult.status === 'rejected') {
      console.error('Blog analysis failed:', blogAnalysisResult.reason);
      warnings.push('블로그 분석 데이터를 불러올 수 없습니다');
    }

    // 신규 사용자에게 더미 데이터 제공에 대한 정보 메시지
    if (shouldProvideDummyData) {
      warnings.push('샘플 데이터를 표시하고 있습니다. 실제 데이터를 보려면 블로그를 연결해주세요.');
    }

    const response: DashboardApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email || '',
          blogId: blogId || undefined
        },
        userStats: userStats || undefined,
        blogAnalysis: blogAnalysis || undefined
      },
      cached: !!blogAnalysis,
      source: blogAnalysis ? 'db' : 'fresh',
      ...(warnings.length > 0 && { warnings }) // 경고가 있을 때만 포함
    };

    return NextResponse.json(response, {
      headers: { 
        'Cache-Control': 'private, max-age=60' // 1분 브라우저 캐시
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    } satisfies DashboardApiResponse, { status: 500 });
  }
}
