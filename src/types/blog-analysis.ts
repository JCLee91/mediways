// 블로그 분석 관련 타입 정의 (기존 api.ts와 분리하여 충돌 방지)

// RSS 피드 기본 구조
export interface RSSPost {
  title: string;
  url: string;
  description: string | null;
  publishDate: Date;
  guid?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  posts: RSSPost[];
  lastBuildDate?: Date;
}

// SEO 분석 결과 (통합 서비스 사용)
import type { SEOAnalysisResult } from '@/lib/services/seoAnalysisService';
export type { SEOAnalysisResult } from '@/lib/services/seoAnalysisService';

export interface AnalyzedPost extends RSSPost {
  seoAnalysis: SEOAnalysisResult;
}

// 블로그 전체 분석 결과
export interface BlogAnalysisResult {
  blogInfo: {
    blogId: string;
    title: string;
    description: string;
    totalPosts: number;
    lastUpdated: Date;
    rssUrl: string;
  };
  
  quickStats: {
    averageTitleLength: number;
    postsWithoutDescription: number;
    recentPostsCount: number;     // 최근 30일 내 글 수
    overallHealthScore: number;   // 전체 건강도 점수
    activityScore: number;        // 활동도 점수
  };
  
  recentPosts: AnalyzedPost[];    // 최근 10-20개 글 분석 결과
  
  summary: {
    topIssues: string[];          // 주요 문제점들
    recommendations: string[];    // 주요 개선 제안들
    strengthAreas: string[];      // 잘하고 있는 영역들
  };
}

// 에러 타입 (기존 APIError와 호환)
export class BlogAnalysisError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public blogId?: string
  ) {
    super(message);
    this.name = 'BlogAnalysisError';
  }
}

// 검증 함수들
export function validateBlogId(blogId: string): asserts blogId is string {
  if (!blogId || typeof blogId !== 'string') {
    throw new BlogAnalysisError('블로그 ID가 필요합니다', 400, 'MISSING_BLOG_ID');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(blogId)) {
    throw new BlogAnalysisError('올바르지 않은 블로그 ID 형식입니다', 400, 'INVALID_BLOG_ID');
  }
  
  if (blogId.length < 2 || blogId.length > 50) {
    throw new BlogAnalysisError('블로그 ID는 2-50자 사이여야 합니다', 400, 'INVALID_BLOG_ID_LENGTH');
  }
}

export function isValidRSSUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'rss.blog.naver.com' && parsed.pathname.endsWith('.xml');
  } catch {
    return false;
  }
}

// 상수 정의
export const BLOG_ANALYSIS_CONSTANTS = {
  MAX_POSTS_TO_ANALYZE: 30,
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 60,
  MIN_DESCRIPTION_LENGTH: 30,
  MAX_DESCRIPTION_LENGTH: 160,
  RECENT_POSTS_DAYS: 30,
  CACHE_DURATION_HOURS: 6,
  
  // 점수 가중치
  TITLE_WEIGHT: 0.4,
  DESCRIPTION_WEIGHT: 0.3,
  CONTENT_WEIGHT: 0.2,
  MEDICAL_WEIGHT: 0.1,
  
  // 의료 키워드들
  MEDICAL_KEYWORDS: [
    '병원', '치료', '시술', '건강', '의료', '진료', '상담',
    '검진', '진단', '수술', '클리닉', '전문의', '의사'
  ],
  
  PROHIBITED_KEYWORDS: [
    '100%', '완치', '즉시', '최고', 'No.1', '1위', '보장',
    '무조건', '확실히', '절대', '영구', '완벽'
  ]
} as const;

