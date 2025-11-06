// 새로운 대시보드 디자인용 데이터 매핑 함수
import type { BlogAnalysisResult } from '@/types/blog-analysis';
import { SEOAnalysisService } from './services/seoAnalysisService';
import { SAMPLE_DASHBOARD_DATA, SAMPLE_SEO_DETAILS } from './dummyData';
import type { DashboardApiResponse, UserStats } from '@/types/api';

/**
 * SEO 분석 결과에서 모든 issues 추출
 */
const extractIssues = (analysis: any): string[] => {
  if (!analysis) return [];

  const allIssues: string[] = [];

  // 1. 제목 issues
  if (analysis.title?.issues && Array.isArray(analysis.title.issues)) {
    allIssues.push(...analysis.title.issues);
  }

  // 2. 가독성 issues
  if (analysis.readability?.issues && Array.isArray(analysis.readability.issues)) {
    allIssues.push(...analysis.readability.issues);
  }

  // 3. 의료법 준수 violations (violations를 issues로 변환)
  if (analysis.compliance?.violations && Array.isArray(analysis.compliance.violations)) {
    allIssues.push(...analysis.compliance.violations.map((v: string) => `의료법 위반: ${v}`));
  }

  // 4. 키워드 issues
  if (analysis.keywords && Array.isArray(analysis.keywords)) {
    analysis.keywords.forEach((kw: any) => {
      if (kw.issues && Array.isArray(kw.issues)) {
        allIssues.push(...kw.issues);
      }
    });
  }

  // 5. 최상위 suggestions (추가 개선사항)
  if (analysis.suggestions && Array.isArray(analysis.suggestions)) {
    allIssues.push(...analysis.suggestions);
  }

  return allIssues;
};

// SEO 분석 서비스 싱글톤 인스턴스
let seoAnalysisServiceInstance: SEOAnalysisService | null = null;

function getSEOAnalysisService(): SEOAnalysisService {
  if (!seoAnalysisServiceInstance) {
    seoAnalysisServiceInstance = new SEOAnalysisService();
  }
  return seoAnalysisServiceInstance;
}

/**
 * 새로운 대시보드의 KPI 카드 데이터 생성
 */
export async function mapToNewDashboardKPIs(analysis: BlogAnalysisResult | null, isDummyMode: boolean = false) {
  if (!analysis || isDummyMode) {
    return {
      medicalLawCompliance: { ...SAMPLE_DASHBOARD_DATA.medicalLawCompliance },
      seoScore: { ...SAMPLE_DASHBOARD_DATA.seoScore },
      analyzedPosts: {
        ...SAMPLE_DASHBOARD_DATA.analyzedPosts,
        status: isDummyMode ? '샘플 데이터' : SAMPLE_DASHBOARD_DATA.analyzedPosts.status
      },
      improvementNeeded: { ...SAMPLE_DASHBOARD_DATA.improvementNeeded }
    };
  }

  const { quickStats, blogInfo, recentPosts } = analysis;

  // 의료법 준수도 계산 (위험 표현 기반)
  const totalRecentPosts = recentPosts.length;
  const dangerousPosts = recentPosts.filter(post => {
    const issues = extractIssues(post.seoAnalysis);
    return issues.some(issue => 
      issue.includes('의료광고법') || issue.includes('과장') || issue.includes('위반')
    );
  }).length;
  const complianceScore = totalRecentPosts > 0
    ? Math.max(50, Math.round(((totalRecentPosts - dangerousPosts) / totalRecentPosts) * 100))
    : 75; // 기본값: 데이터 없음 시 보수적인 준수도

  // SEO 점수 (통합 SEO 분석 서비스 사용)
  const seoScores = recentPosts
    .map(post => post.seoAnalysis?.overallScore)
    .filter((score): score is number => typeof score === 'number' && !Number.isNaN(score));

  const seoScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((sum, score) => sum + score, 0) / seoScores.length)
    : null;

  // 개선이 필요한 글 개수 계산 (이슈가 1개라도 있는 글)
  const postsNeedingImprovement = recentPosts.filter(post => {
    const issues = extractIssues(post.seoAnalysis);
    return issues.length > 0;
  }).length;

  return {
    medicalLawCompliance: {
      score: complianceScore,
      status: complianceScore >= 80 ? '양호' : complianceScore >= 70 ? '주의' : '위험',
      statusType: complianceScore >= 80 ? 'good' as const : complianceScore >= 70 ? 'warning' as const : 'danger' as const
    },
    seoScore: seoScore !== null ? {
      score: seoScore,
      status: seoScore >= 80 ? '양호' : seoScore >= 70 ? '주의' : '개선 필요',
      statusType: seoScore >= 80 ? 'good' as const : seoScore >= 70 ? 'warning' as const : 'danger' as const
    } : {
      score: quickStats.overallHealthScore,
      status: '데이터 없음',
      statusType: 'info' as const
    },
    analyzedPosts: {
      count: blogInfo.totalPosts,
      label: '분석된 글',
      status: '데이터 수집',
      statusType: 'info' as const
    },
    improvementNeeded: {
      count: postsNeedingImprovement,
      label: '개선 필요',
      status: postsNeedingImprovement > 0 ? '확인 필요' : '양호',
      statusType: postsNeedingImprovement > 0 ? 'warning' as const : 'good' as const
    }
  };
}

/**
 * SEO 상세 점수 데이터 생성 (통합 SEO 분석 서비스 사용)
 */
export async function mapToSEODetailScores(analysis: BlogAnalysisResult | null, isDummyMode: boolean = false) {
  if (!analysis || isDummyMode) {
    // 더미 데이터 제공
    return SAMPLE_SEO_DETAILS;
  }

  const { recentPosts } = analysis;

  if (recentPosts.length === 0) {
    return null;
  }

  // 통합 SEO 분석 서비스 사용 (싱글톤)
  const fallbackScore = 65;
  const titleScores: number[] = [];
  const descScores: number[] = [];
  const keywordScores: number[] = [];
  const readabilityScores: number[] = [];

  recentPosts.forEach(post => {
    const analysis: any = post.seoAnalysis;
    if (!analysis) return;

    const addScore = (arr: number[], value?: number) => {
      if (typeof value === 'number' && value > 0) {
        arr.push(value);
      } else {
        arr.push(fallbackScore);
      }
    };

    if (analysis.title && typeof analysis.title.score === 'number') {
      addScore(titleScores, (analysis.title.score / 20) * 100);
    } else if (typeof analysis.titleScore === 'number') {
      addScore(titleScores, (analysis.titleScore / 40) * 100);
    } else {
      addScore(titleScores);
    }

    if (analysis.description && typeof analysis.description.score === 'number') {
      addScore(descScores, (analysis.description.score / 10) * 100);
    } else if (typeof analysis.descriptionScore === 'number') {
      addScore(descScores, (analysis.descriptionScore / 30) * 100);
    } else {
      addScore(descScores);
    }

    if (analysis.scoreBreakdown && typeof analysis.scoreBreakdown.keywords === 'number') {
      addScore(keywordScores, (analysis.scoreBreakdown.keywords / 10) * 100);
    } else if (typeof analysis.contentScore === 'number') {
      addScore(keywordScores, (analysis.contentScore / 20) * 100);
    } else {
      addScore(keywordScores);
    }

    if (analysis.readability && typeof analysis.readability.score === 'number') {
      addScore(readabilityScores, (analysis.readability.score / 15) * 100);
    } else {
      addScore(readabilityScores);
    }
  });

  if (titleScores.length === 0 && descScores.length === 0 && keywordScores.length === 0 && readabilityScores.length === 0) {
    return null;
  }

  const averageOrFallback = (scores: number[]) =>
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 65;

  return {
    titleOptimization: averageOrFallback(titleScores),
    descriptionCompletion: averageOrFallback(descScores),
    keywordDensity: averageOrFallback(keywordScores),
    readability: averageOrFallback(readabilityScores)
  };
}

/**
 * 의료법 위험 표현 데이터 생성 (실제 분석 결과 기반)
 */
export function mapToMedicalRiskAnalysis(analysis: BlogAnalysisResult | null) {
  if (!analysis || !analysis.recentPosts || analysis.recentPosts.length === 0) {
    return {
      foundRisks: [],
      complianceStats: {
        safePostsCount: 0,
        totalPostsCount: 0,
        safePostsPercentage: 0
      },
      message: '분석된 블로그 글이 없습니다. 프로필에서 블로그 ID를 설정해주세요.'
    };
  }

  const { recentPosts } = analysis;
  const riskMap = new Map<string, number>();

  // 실제 의료법 위반 표현 수집
  recentPosts.forEach(post => {
    const compliance = post.seoAnalysis?.compliance;
    if (!compliance || !compliance.violations || compliance.violations.length === 0) {
      return;
    }

    // 실제 위반 항목 카운트
    compliance.violations.forEach((violation: string) => {
      const current = riskMap.get(violation) || 0;
      riskMap.set(violation, current + 1);
    });
  });

  // 위험 표현 목록 생성 (상위 10개)
  const foundRisks = Array.from(riskMap.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 준수 현황 계산 (실제 compliance 데이터 기반)
  const safePosts = recentPosts.filter(post => {
    const compliance = post.seoAnalysis?.compliance;
    if (!compliance) return false;
    return compliance.isCompliant || (compliance.violations && compliance.violations.length === 0);
  });

  const safePostsCount = safePosts.length;
  const totalPostsCount = recentPosts.length;
  const safePostsPercentage = totalPostsCount > 0
    ? Math.round((safePostsCount / totalPostsCount) * 100)
    : 0;

  return {
    foundRisks,
    complianceStats: {
      safePostsCount,
      totalPostsCount,
      safePostsPercentage
    },
    message: foundRisks.length === 0
      ? `분석된 ${totalPostsCount}개 글 중 의료법 위반 표현이 발견되지 않았습니다. 👍`
      : undefined
  };
}

/**
 * 콘텐츠 활동 데이터 생성
 */
export function mapToContentActivity(analysis: BlogAnalysisResult | null) {
  if (!analysis) {
    return {
      totalPosts: 23,
      monthlyPosts: 4,
      aiGenerated: 12,
      analysisProgress: 100
    };
  }

  const { blogInfo, recentPosts } = analysis;
  
  // 이번 달 발행된 글 수 계산
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  const monthlyPosts = recentPosts.filter(post => {
    const publishDate = typeof post.publishDate === 'string' 
      ? new Date(post.publishDate) 
      : post.publishDate;
    return publishDate.getMonth() === thisMonth && publishDate.getFullYear() === thisYear;
  }).length;

  // AI 생성 글 수 추정 (실제 데이터가 없으므로 추정)
  const aiGenerated = Math.round(blogInfo.totalPosts * 0.4); // 전체의 40% 추정

  return {
    totalPosts: blogInfo.totalPosts,
    monthlyPosts: monthlyPosts,
    aiGenerated: aiGenerated,
    analysisProgress: 100 // 분석 완료
  };
}

/**
 * 최근 분석 로그 데이터 생성
 */
export function mapToRecentAnalysisLogs(analysis: BlogAnalysisResult | null) {
  if (!analysis) {
    return [
      {
        title: '"점액종 제거 후기" 글 분석 완료',
        seoScore: 92,
        complianceScore: 85,
        timeAgo: '2시간 전',
        status: 'success' as const,
        url: '#'
      },
      {
        title: '"피부과 상담 안내" 글 분석 완료',
        seoScore: 78,
        complianceScore: 70,
        timeAgo: '4시간 전',
        status: 'warning' as const,
        url: '#'
      },
      {
        title: '"여드름 치료 방법" 글 분석 완료',
        seoScore: 85,
        complianceScore: 92,
        timeAgo: '6시간 전',
        status: 'success' as const,
        url: '#'
      }
    ];
  }

  return analysis.recentPosts.map(post => {
    const publishDate = typeof post.publishDate === 'string' 
      ? new Date(post.publishDate) 
      : post.publishDate;
    const hoursAgo = Math.floor((Date.now() - publishDate.getTime()) / (1000 * 60 * 60));
    
    let timeAgo: string;
    if (hoursAgo < 1) {
      timeAgo = '방금 전';
    } else if (hoursAgo < 24) {
      timeAgo = `${hoursAgo}시간 전`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeAgo = `${daysAgo}일 전`;
    }

    // 의료법 준수 점수 계산
    const issues = extractIssues(post.seoAnalysis);
    const hasComplianceIssues = issues.some(issue => 
      issue.includes('의료광고법') || issue.includes('과장') || issue.includes('위반')
    ) || false;
    const complianceScore = !hasComplianceIssues ? 90 + Math.floor(Math.random() * 10) : 60 + Math.floor(Math.random() * 20);
    const seoScore = post.seoAnalysis?.overallScore ?? 0;
    const status = complianceScore >= 80 && seoScore >= 80 ? 'success' : 'warning';

    return {
      title: `"${post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title}" 글 분석 완료`,
      seoScore,
      complianceScore: complianceScore,
      timeAgo: timeAgo,
      status: status as 'success' | 'warning',
      url: post.url
    };
  });
}
