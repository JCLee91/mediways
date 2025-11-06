import type { MedicalSpecialtyValue } from './medical-specialty';

// API Request Types
export interface GenerateContentRequest {
  type: 'blog' | 'sns' | 'youtube' | 'copywriting';
  subType?: string;
  data: BlogData | SNSData | YoutubeData | CopywritingData;
}

// 톤 타입을 상수로 정의
export const VALID_TONES = ['~해요체', '~습니다체', '반말'] as const;
export type ToneType = typeof VALID_TONES[number];

export interface BlogData {
  topic: string;
  tone: ToneType;
  toneExample?: string;
  content: string;
  medicalSpecialty?: MedicalSpecialtyValue; // 진료과목 추가
}

export interface SNSData {
  snsType: '인스타그램' | '틱톡/숏츠' | 'X (트위터)' | '쓰레드';
  content: string;
  additional?: string;
  medicalSpecialty?: MedicalSpecialtyValue; // 진료과목 추가
}

export interface YoutubeData {
  topic: string;
  tone: ToneType;
  content: string;
  medicalSpecialty?: MedicalSpecialtyValue; // 진료과목 추가
}

export interface CopywritingData {
  language: 'korean' | 'english';
  productIntro: string;
  emphasize: string;
  charCount: string;
  medicalSpecialty?: MedicalSpecialtyValue; // 진료과목 추가
}

// API Response Types
export interface GenerateContentResponse {
  success: boolean;
  data?: string;
  error?: string;
}

// Validation Functions
export function validateTone(tone: string): asserts tone is ToneType {
  if (!VALID_TONES.includes(tone as ToneType)) {
    throw new APIError('잘못된 말투 옵션입니다', 400, 'INVALID_TONE');
  }
}

// Error Types
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// 블로그 분석 API 요청/응답 (blog-analysis.ts와 통합)
export interface BlogAnalysisApiRequest {
  blogId: string;
  options?: {
    maxPosts?: number;
    includeOldPosts?: boolean;
  };
}

export interface BlogAnalysisApiResponse {
  success: boolean;
  data?: import('@/types/blog-analysis').BlogAnalysisResult;
  error?: string;
  cached?: boolean;
  cacheExpiry?: string; // ISO date string for API consistency
  stale?: boolean; // true if returned data is stale while revalidating
  source?: 'db' | 'memory' | 'fresh'; // where the data came from
}

// 통합 대시보드 API 타입
export interface UserStats {
  totalGenerations: number;
  todayGenerations: number;
  thisWeekGenerations: number;
  thisMonthGenerations: number;
  typeDistribution: {
    blog: number;
    sns: number;
    youtube: number;
    copywriting: number;
  };
  recentGenerations: Array<{
    id: string;
    type: string;
    sub_type?: string;
    created_at: string;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
}

export interface DashboardApiResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      blogId?: string;
    };
    blogAnalysis?: import('@/types/blog-analysis').BlogAnalysisResult;
    userStats?: UserStats;
  };
  error?: string;
  cached?: boolean;
  cacheExpiry?: string;
  stale?: boolean;
  source?: 'db' | 'memory' | 'fresh';
  warnings?: string[]; // 부분 실패시 경고 메시지
  guest?: boolean; // 비로그인 샘플 모드 여부
}
