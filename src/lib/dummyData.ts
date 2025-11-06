// 신규 회원용 더미 데이터 및 온보딩 데이터
import type { BlogAnalysisResult } from '@/types/blog-analysis';

/**
 * 신규 회원을 위한 샘플 대시보드 데이터
 * 실제 의료 블로그 예시를 기반으로 한 현실적인 더미 데이터
 */
export const SAMPLE_DASHBOARD_DATA = {
  medicalLawCompliance: {
    score: 78,
    status: '주의 필요',
    statusType: 'warning' as const,
    description: '일부 표현에서 의료법 위반 가능성이 발견되었습니다'
  },
  seoScore: {
    score: 82,
    status: '양호',
    statusType: 'good' as const,
    description: 'SEO 최적화가 잘 되어 있습니다'
  },
  analyzedPosts: {
    count: 23,
    label: '분석된 글',
    status: '샘플 데이터',
    statusType: 'info' as const
  },
  improvementNeeded: {
    count: 8,
    label: '개선 필요',
    status: '확인 필요',
    statusType: 'warning' as const
  }
};

/**
 * 샘플 의료법 위험 표현들 (교육용)
 */
export const SAMPLE_RISK_EXPRESSIONS = [
  { text: '100% 완치', count: 3, type: 'treatment_guarantee' },
  { text: '부작용 없음', count: 2, type: 'no_side_effects' },
  { text: '최고의 병원', count: 1, type: 'comparative_advertising' }
];

/**
 * 샘플 블로그 글 목록 (실제 의료 블로그 스타일)
 */
export const SAMPLE_BLOG_POSTS = [
  {
    title: '무릎 관절염 치료, 어떤 방법이 가장 효과적일까?',
    seoScore: 85,
    complianceScore: 92,
    publishedAt: '2024-09-15',
    riskLevel: 'low',
    timeAgo: '3일 전'
  },
  {
    title: '당뇨병 환자를 위한 운동 가이드라인',
    seoScore: 78,
    complianceScore: 88,
    publishedAt: '2024-09-12',
    riskLevel: 'medium',
    timeAgo: '6일 전'
  },
  {
    title: '레이저 시술 후 관리법과 주의사항',
    seoScore: 92,
    complianceScore: 76,
    publishedAt: '2024-09-10',
    riskLevel: 'high',
    timeAgo: '8일 전'
  },
  {
    title: '고혈압 예방을 위한 생활습관 개선법',
    seoScore: 88,
    complianceScore: 94,
    publishedAt: '2024-09-08',
    riskLevel: 'low',
    timeAgo: '10일 전'
  },
  {
    title: '피부과 시술 전 알아야 할 필수 정보',
    seoScore: 81,
    complianceScore: 82,
    publishedAt: '2024-09-05',
    riskLevel: 'medium',
    timeAgo: '13일 전'
  }
];

/**
 * SEO 상세 점수 샘플 데이터 - dashboard-mapper에서 사용
 */
export const SAMPLE_SEO_DETAILS = {
  titleOptimization: 85,
  descriptionCompletion: 78,
  keywordDensity: 82,
  readability: 88
};

/**
 * 콘텐츠 활동 통계
 */
export const SAMPLE_CONTENT_ACTIVITY = {
  totalPosts: 23,
  monthlyPosts: 8,
  aiGenerated: 0, // 아직 AI 생성 경험 없음
  analysisProgress: 100
};

/**
 * 사용자가 신규 회원인지 확인 (생성 로그가 없으면 신규)
 */
export function isNewUser(userStats: any): boolean {
  if (!userStats) return true;
  return (userStats.totalGenerations || 0) === 0;
}

/**
 * 신규 회원 여부 확인 및 더미 데이터 표시 로직
 * 복잡한 타입 생성 대신 기존 mapper 함수의 null 케이스를 활용
 */
export function shouldShowDummyData(userStats: any, blogAnalysis: any): boolean {
  // 신규 회원이고 실제 블로그 분석 데이터가 없는 경우 더미 데이터 표시
  return isNewUser(userStats) && !blogAnalysis;
}

/**
 * 더미 위험 분석 데이터 생성
 */
export function createDummyRiskAnalysis() {
  return {
    foundRisks: SAMPLE_RISK_EXPRESSIONS,
    complianceStats: {
      safePostsCount: 20,
      totalPostsCount: SAMPLE_CONTENT_ACTIVITY.totalPosts,
      safePostsPercentage: 87
    }
  };
}

/**
 * 더미 콘텐츠 활동 데이터 반환
 */
export function createDummyContentActivity() {
  return SAMPLE_CONTENT_ACTIVITY;
}

/**
 * 더미 최근 로그 데이터 생성
 */
export function createDummyRecentLogs() {
  return SAMPLE_BLOG_POSTS.slice(0, 3).map(post => ({
    title: post.title,
    seoScore: post.seoScore,
    complianceScore: post.complianceScore,
    status: 'success',
    timeAgo: post.timeAgo,
    url: '#'
  }));
}
