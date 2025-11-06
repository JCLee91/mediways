"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/stores/userStore";
import { useLoadingStates, useDelayedLoading } from "@/hooks/useLoadingStates";
import CircularScoreNew from "@/components/dashboard/CircularScoreNew";
import { 
  mapToNewDashboardKPIs,
  mapToSEODetailScores,
  mapToMedicalRiskAnalysis,
  mapToContentActivity,
  mapToRecentAnalysisLogs
} from "@/lib/dashboard-mapper-new";
import { getAnalysisStatusMessage } from "@/lib/dashboard-mapper";
import { 
  isNewUser, 
  shouldShowDummyData, 
  createDummyRiskAnalysis, 
  createDummyContentActivity, 
  createDummyRecentLogs 
} from "@/lib/dummyData";
import WelcomeBanner from "@/components/WelcomeBanner";
import type { BlogAnalysisResult } from "@/types/blog-analysis";
import type { DashboardApiResponse, UserStats } from "@/types/api";

export default function Dashboard() {
  const [blogAnalysis, setBlogAnalysis] = useState<BlogAnalysisResult | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // 전역 스토어에서 사용자 정보 가져오기
  const { user, blogId: userBlogId, isInitialized } = useUserStore();
  
  // 통합 로딩 상태 관리
  const { isLoading, startLoading, stopLoading, setError, error } = useLoadingStates();
  const { showLoading, startDelayedLoading, stopDelayedLoading } = useDelayedLoading(250);

  // Local cache helpers for dashboard
  const getDashboardCacheKey = (userId: string, blogId?: string) => `dashboard:${userId}:${blogId || 'no-blog'}`;
  const readLocalDashboardCache = (userId: string, blogId?: string): { blogAnalysis?: BlogAnalysisResult; userStats?: UserStats; userBlogId?: string } | null => {
    try {
      const raw = localStorage.getItem(getDashboardCacheKey(userId, blogId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  };
  const writeLocalDashboardCache = (userId: string, blogId: string | undefined, data: { blogAnalysis?: BlogAnalysisResult; userStats?: UserStats; userBlogId?: string }) => {
    try {
      const payload = { ts: Date.now(), data };
      localStorage.setItem(getDashboardCacheKey(userId, blogId), JSON.stringify(payload));
    } catch {}
  };

  useEffect(() => {
    if (!isInitialized) return;
    loadDashboardData();
  }, [isInitialized, user?.id, userBlogId]);

  const loadDashboardData = async () => {
    try {
      const isAuthenticated = Boolean(user);
      const cacheUserId = user?.id;

      startLoading('dashboard-init');

      const cached = isAuthenticated
        ? readLocalDashboardCache(user!.id, userBlogId || undefined)
        : null;
      const hasCache = !!cached;
      if (cached) {
        setBlogAnalysis(cached.blogAnalysis || null);
        setUserStats(cached.userStats || null);
        setIsGuestMode(false);
      }

      // 2) 지연 로딩 표시 (캐시가 없을 때만)
      if (!hasCache) {
        startDelayedLoading();
      }

      // 3) 통합 API 호출
      const response = await fetch('/api/dashboard');
      const result: DashboardApiResponse = await response.json();

      if (result.success && result.data) {
        const { user: userData, blogAnalysis, userStats } = result.data;
        setIsGuestMode(Boolean(result.guest));
        setBlogAnalysis(blogAnalysis || null);
        setUserStats(userStats || null);
        
        // 로컬 캐시에 저장 (로그인 사용자만)
        if (isAuthenticated && cacheUserId && userData) {
          writeLocalDashboardCache(cacheUserId, userData.blogId, {
            blogAnalysis: blogAnalysis || undefined,
            userStats: userStats || undefined,
            userBlogId: userData.blogId || undefined
          });
        }
      } else {
        setError(result.error || '대시보드 로드에 실패했습니다');
      }

      stopDelayedLoading();
      stopLoading('dashboard-init');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('네트워크 오류가 발생했습니다');
      stopDelayedLoading();
      stopLoading('dashboard-init');
    }
  };


  // 데이터 매핑 (async 처리)
  const [kpiData, setKpiData] = useState<any>(null);
  const [seoScores, setSeoScores] = useState<any>(null);
  
  // 신규 회원의 경우 더미 데이터로 대체
  const shouldUseDummyData = isGuestMode || shouldShowDummyData(userStats, blogAnalysis);
  const riskAnalysis = shouldUseDummyData 
    ? createDummyRiskAnalysis() 
    : mapToMedicalRiskAnalysis(blogAnalysis);
  
  const contentActivity = shouldUseDummyData 
    ? createDummyContentActivity() 
    : mapToContentActivity(blogAnalysis);
  
  const recentLogs = shouldUseDummyData
    ? createDummyRecentLogs()
    : mapToRecentAnalysisLogs(blogAnalysis);
  const hasSeoDetail = !!seoScores;
  const kpiCardBase = "bg-black border border-gray-800 rounded-2xl p-4 text-center h-full";

  // 페이지네이션 계산
  const totalLogs = recentLogs.length;
  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLogs = recentLogs.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 이전/다음 페이지
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // 비동기 데이터 매핑 처리
  useEffect(() => {
    const loadAsyncData = async () => {
      // 더미 데이터 모드 확인
      const useDummyData = shouldUseDummyData;
      
      try {
        const [kpiResult, seoResult] = await Promise.all([
          mapToNewDashboardKPIs(blogAnalysis, useDummyData),
          mapToSEODetailScores(blogAnalysis, useDummyData)
        ]);
        setKpiData(kpiResult);
        setSeoScores(seoResult);
      } catch (error) {
        console.error('대시보드 데이터 매핑 실패:', error);
        // 에러 발생 시 더미 데이터로 폴백
        const [fallbackKpi, fallbackSeo] = await Promise.all([
          mapToNewDashboardKPIs(null, true),
          mapToSEODetailScores(null, true)
        ]);
        setKpiData(fallbackKpi);
        setSeoScores(fallbackSeo);
      }
    };

    loadAsyncData();
  }, [blogAnalysis, shouldUseDummyData]);

  return (
    <div className="min-h-screen bg-background p-1 sm:p-2">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Welcome Banner for new users */}
        <WelcomeBanner userStats={userStats} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">대시보드</h1>
          <p className="text-gray-400 mb-4">
            {isNewUser(userStats) 
              ? "아래는 실제 의료 블로그 분석 결과 예시입니다. 본인의 데이터를 보려면 블로그를 연결해보세요."
              : "블로그의 의료법 준수와 SEO 최적화 상태를 한눈에 확인하세요"
            }
          </p>
        </div>
        {/* 상태 메시지 (필요한 경우만) */}
        {(() => {
          // 더미 데이터 모드인 경우 특별 메시지 표시
          if (shouldUseDummyData) {
            return (
              <div className="rounded-lg p-3 mb-6 bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-blue-400">
                      📊 <strong>샘플 데이터 모드</strong> - 실제 의료 블로그 분석 결과 예시입니다.
                      <a 
                        href="/profile" 
                        className="ml-2 underline hover:text-blue-300 transition-colors"
                      >
                        내 블로그 연결하기 →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          const statusMessage = getAnalysisStatusMessage(
            showLoading,
            error,
            !!userBlogId
          );
          
          // 블로그 ID 미설정이나 에러인 경우에만 표시
          if (statusMessage.type === 'setup' || statusMessage.type === 'error') {
            return (
              <div className={`rounded-lg p-3 mb-6 ${
                statusMessage.type === 'setup' ? 'bg-blue-500/10 border border-blue-500/30' :
                'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className={`text-sm ${
                      statusMessage.type === 'setup' ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {statusMessage.message}
                      {statusMessage.type === 'setup' && (
                        <a 
                          href="/profile" 
                          className="ml-2 underline hover:text-blue-300 transition-colors"
                        >
                          프로필에서 설정하기 →
                        </a>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          // 정상 상태에서는 아무것도 표시하지 않음
          return null;
        })()}

        {/* 핵심 KPI 상단 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 의료법 준수도 */}
          <div className={kpiCardBase}>
            <CircularScoreNew 
              score={kpiData?.medicalLawCompliance?.score || 0} 
              size="lg" 
              className="mx-auto mb-2"
              isLoading={isLoading || showLoading || !kpiData}
            />
            <div className="text-xs text-gray-400 mt-1">의료법 준수도</div>
            <div className={`text-xs mt-1 ${
              kpiData?.medicalLawCompliance?.statusType === 'good' ? 'text-green-400' :
              kpiData?.medicalLawCompliance?.statusType === 'warning' ? 'text-orange-400' :
              'text-red-400'
            }`}>
              {kpiData?.medicalLawCompliance?.status || '로딩중...'}
            </div>
          </div>

          {/* SEO 점수 */}
          <div className={kpiCardBase}>
            <CircularScoreNew 
              score={kpiData?.seoScore?.score || 0} 
              size="lg" 
              className="mx-auto mb-2"
              isLoading={isLoading || showLoading || !kpiData}
            />
            <div className="text-xs text-gray-400 mt-1">SEO 점수</div>
            <div className={`text-xs mt-1 ${
              kpiData?.seoScore?.statusType === 'good' ? 'text-green-400' :
              kpiData?.seoScore?.statusType === 'warning' ? 'text-orange-400' :
              'text-red-400'
            }`}>
              {kpiData?.seoScore?.status || '로딩중...'}
            </div>
          </div>

          {/* 분석된 글 */}
          <div className={kpiCardBase}>
            <div className="h-[70px] flex items-center justify-center mb-2">
              <div className="text-2xl font-bold text-white">
                {isLoading || showLoading || !kpiData ? '...' : `${kpiData.analyzedPosts.count}개`}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">{kpiData?.analyzedPosts?.label || '분석된 글'}</div>
            <div className="text-xs text-blue-400 mt-1">{kpiData?.analyzedPosts?.status || '로딩중...'}</div>
          </div>

          {/* 개선 사항 */}
          <div className={kpiCardBase}>
            <div className="h-[70px] flex items-center justify-center mb-2">
              <div className="text-2xl font-bold text-white">
                {isLoading || showLoading || !kpiData ? '...' : `${kpiData.improvementNeeded.count}개`}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">{kpiData?.improvementNeeded?.label || '개선 사항'}</div>
            <div className={`text-xs mt-1 ${
              kpiData?.improvementNeeded?.statusType === 'good' ? 'text-green-400' :
              kpiData?.improvementNeeded?.statusType === 'warning' ? 'text-orange-400' :
              'text-gray-400'
            }`}>
              {kpiData?.improvementNeeded?.status || '로딩중...'}
            </div>
          </div>
        </div>

        {/* 메인 대시보드 영역 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* 의료법 준수 현황 */}
          <div className="bg-black border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">의료법 준수 현황</h2>
              <span className={`px-2 py-1 text-xs rounded-full ${
                kpiData?.medicalLawCompliance?.statusType === 'good' ? 'bg-green-500/20 text-green-400' :
                kpiData?.medicalLawCompliance?.statusType === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {kpiData?.medicalLawCompliance?.status || '로딩중...'}
              </span>
            </div>
            
            <div className="space-y-4">
              {/* 발견된 위험 표현 */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-sm font-medium text-red-400 mb-2">발견된 위험 표현</div>
                <div className="space-y-1 text-xs text-gray-300">
                  {riskAnalysis.foundRisks.map((risk, index) => (
                    <div key={index}>• "{risk.text}" ({risk.count}곳)</div>
                  ))}
                </div>
              </div>
              
              {/* 준수 현황 */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-400 mb-2">준수 현황</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">안전한 글</span>
                    <span className="text-white">
                      {riskAnalysis.complianceStats.safePostsCount}/{riskAnalysis.complianceStats.totalPostsCount}개 ({riskAnalysis.complianceStats.safePostsPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${riskAnalysis.complianceStats.safePostsPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEO 최적화 현황 */}
          <div className="bg-black border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">SEO 최적화 현황</h2>
              <span className={`px-2 py-1 text-xs rounded-full ${
                kpiData?.seoScore?.statusType === 'good' ? 'bg-green-500/20 text-green-400' :
                kpiData?.seoScore?.statusType === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                kpiData?.seoScore?.statusType === 'danger' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {kpiData?.seoScore?.status || '로딩중...'}
              </span>
            </div>
            
            {hasSeoDetail && seoScores ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-black border border-gray-800 rounded-xl">
                    <CircularScoreNew 
                      score={seoScores.titleOptimization ?? 0} 
                      size="sm" 
                      className="mx-auto"
                      isLoading={isLoading || showLoading || !seoScores}
                    />
                    <div className="text-xs text-gray-400 mt-2">제목 최적화</div>
                  </div>
                  <div className="text-center p-3 bg-black border border-gray-800 rounded-xl">
                    <CircularScoreNew 
                      score={seoScores.descriptionCompletion ?? 0} 
                      size="sm" 
                      className="mx-auto"
                      isLoading={isLoading || showLoading || !seoScores}
                    />
                    <div className="text-xs text-gray-400 mt-2">설명문 완성</div>
                  </div>
                  <div className="text-center p-3 bg-black border border-gray-800 rounded-xl">
                    <CircularScoreNew
                      score={seoScores.keywordDensity ?? 0}
                      size="sm"
                      className="mx-auto"
                      isLoading={isLoading || showLoading || !seoScores}
                    />
                    <div className="text-xs text-gray-400 mt-2">의료 키워드</div>
                  </div>
                  <div className="text-center p-3 bg-black border border-gray-800 rounded-xl">
                    <CircularScoreNew 
                      score={seoScores.readability ?? 0} 
                      size="sm" 
                      className="mx-auto"
                      isLoading={isLoading || showLoading || !seoScores}
                    />
                    <div className="text-xs text-gray-400 mt-2">가독성</div>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-400 mb-2">분석 결과 요약</div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>• 평균 SEO 점수: {kpiData?.seoScore?.score || 0}점 ({kpiData?.seoScore?.status || '로딩중...'})</div>
                    <div>• 의료법 준수율: {kpiData?.medicalLawCompliance?.score || 0}점 ({kpiData?.medicalLawCompliance?.status || '로딩중...'})</div>
                    <div>• 개선 필요 글: {kpiData?.improvementNeeded?.count || 0}개 ({kpiData?.improvementNeeded?.status || '로딩중...'})</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black border border-dashed border-gray-700 rounded-xl p-6 text-center text-sm text-gray-400">
                SEO 상세 데이터를 불러올 수 없습니다. 블로그 분석이 완료되면 자동으로 업데이트됩니다.
              </div>
            )}
          </div>

          {/* 콘텐츠 활동 */}
          <div className="bg-black border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">콘텐츠 활동</h2>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">활성</span>
            </div>
            
            <div className="space-y-4">
              {/* 활동 통계 */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center p-3 bg-black border border-gray-800 rounded-xl">
                  <div>
                    <div className="text-sm text-gray-300">총 블로그 글</div>
                    <div className="text-lg font-bold text-white">
                      {isLoading || showLoading ? '...' : `${contentActivity.totalPosts}개`}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-black border border-gray-800 rounded-xl">
                  <div>
                    <div className="text-sm text-gray-300">이달 발행</div>
                    <div className="text-lg font-bold text-white">
                      {isLoading || showLoading ? '...' : `${contentActivity.monthlyPosts}개`}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-black border border-gray-800 rounded-xl">
                  <div>
                    <div className="text-sm text-gray-300">AI 생성</div>
                    <div className="text-lg font-bold text-white">
                      {isLoading || showLoading ? '...' : `${contentActivity.aiGenerated}개`}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-400 rounded"></div>
                  </div>
                </div>
              </div>
              
              {/* 데이터 수집 현황 */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="text-sm font-medium text-green-400 mb-2">데이터 수집 현황</div>
                <div className="space-y-1 text-xs text-gray-300">
                  <div>• RSS 피드 분석: 실시간</div>
                  <div>• 의료법 검증: 자동화</div>
                  <div>• SEO 스코어링: 완료</div>
                </div>
              </div>
              
              {/* 블로그 분석 진행률 */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-white">블로그 분석 진행률</div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${contentActivity.analysisProgress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{contentActivity.totalPosts}개 분석 완료</span>
                  <span>최신 상태</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 로그 */}
        <div className="bg-black border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">최근 분석 결과</h3>
            <span className="text-xs text-gray-400">
              전체 {totalLogs}개
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {currentLogs.map((log, index) => (
              <a
                key={startIndex + index}
                href={log.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 px-4 border border-gray-800 rounded-lg hover:bg-gray-900/50 hover:border-gray-700 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'success' ? 'bg-green-400' : 'bg-orange-400'
                  }`}></span>
                  <span className="text-sm text-white group-hover:text-blue-400 transition-colors">
                    {log.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-400">SEO: {log.seoScore}점</span>
                  <span className="text-sm text-blue-400">의료법: {log.complianceScore}점</span>
                  <span className="text-xs text-gray-400">{log.timeAgo}</span>
                  <svg
                    className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="text-sm text-gray-400">
                {startIndex + 1}-{Math.min(endIndex, totalLogs)} / {totalLogs}개
              </div>

              <div className="flex items-center gap-2">
                {/* 이전 버튼 */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // 현재 페이지 주변 2개만 표시
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="text-gray-600 px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* 다음 버튼 */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
