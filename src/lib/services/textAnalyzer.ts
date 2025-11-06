import { BLOG_ANALYSIS_CONSTANTS } from '@/types/blog-analysis';

// 텍스트 분석 결과 타입
export interface TextAnalysisResult {
  wordCount: number;
  charCount: number;
  sentences: number;
  avgWordsPerSentence: number;
}

export interface TitleAnalysisResult {
  length: number;
  isOptimal: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface DescriptionAnalysisResult {
  length: number;
  isOptimal: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface KeywordDensityResult {
  keyword: string;
  count: number;
  density: number;
  isOptimal: boolean;
  issues: string[];
}

export interface ReadabilityResult {
  avgSentenceLength: number;
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
}

export class TextAnalyzer {
  /**
   * 기본 텍스트 분석
   */
  analyze(content: string): TextAnalysisResult {
    if (!content || content.trim().length === 0) {
      return {
        wordCount: 0,
        charCount: 0,
        sentences: 0,
        avgWordsPerSentence: 0
      };
    }

    const cleanText = content.trim();
    
    // 단어 수: 공백으로 구분된 단어들
    const words = cleanText.match(/\S+/g) || [];
    const wordCount = words.length;
    
    // 문자 수: 공백 포함
    const charCount = cleanText.length;
    
    // 문장 수: 마침표, 느낌표, 물음표로 구분
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    
    // 평균 문장당 단어 수
    const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
    
    return {
      wordCount,
      charCount,
      sentences: sentenceCount,
      avgWordsPerSentence
    };
  }

  /**
   * 제목 분석
   */
  analyzeTitle(title: string): TitleAnalysisResult {
    const length = title.length;
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 길이 검증
    if (length === 0) {
      issues.push('제목이 없습니다');
      suggestions.push('매력적인 제목을 작성하세요');
      return { length, isOptimal: false, score: 0, issues, suggestions };
    }

    if (length < BLOG_ANALYSIS_CONSTANTS.MIN_TITLE_LENGTH) {
      issues.push('제목이 너무 짧습니다');
      suggestions.push(`제목은 최소 ${BLOG_ANALYSIS_CONSTANTS.MIN_TITLE_LENGTH}자 이상 권장합니다`);
      score = Math.max(0, (length / BLOG_ANALYSIS_CONSTANTS.MIN_TITLE_LENGTH) * 20);
    } else if (length > BLOG_ANALYSIS_CONSTANTS.MAX_TITLE_LENGTH) {
      issues.push('제목이 너무 깁니다');
      suggestions.push(`제목은 ${BLOG_ANALYSIS_CONSTANTS.MAX_TITLE_LENGTH}자 이하 권장합니다`);
      score = Math.max(10, 40 - ((length - BLOG_ANALYSIS_CONSTANTS.MAX_TITLE_LENGTH) * 1.5));
    } else {
      // 적절한 길이 (10-60자)
      score = 35;
      suggestions.push('제목 길이가 적절합니다');
    }

    // 의료 키워드 보너스
    const medicalKeywords = BLOG_ANALYSIS_CONSTANTS.MEDICAL_KEYWORDS;
    const hasKeyword = medicalKeywords.some(keyword => title.includes(keyword));
    if (hasKeyword) {
      score += 5;
      suggestions.push('의료 관련 키워드가 포함되어 좋습니다');
    }

    const isOptimal = length >= BLOG_ANALYSIS_CONSTANTS.MIN_TITLE_LENGTH && 
                     length <= BLOG_ANALYSIS_CONSTANTS.MAX_TITLE_LENGTH;

    return {
      length,
      isOptimal,
      score: Math.min(40, Math.max(0, score)),
      issues,
      suggestions
    };
  }

  /**
   * 설명문 분석
   */
  analyzeDescription(description: string): DescriptionAnalysisResult {
    const length = description.length;
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (length === 0) {
      issues.push('메타 설명이 없습니다');
      suggestions.push('검색 결과에 표시될 설명문을 작성하세요');
      return { length, isOptimal: false, score: 0, issues, suggestions };
    }

    if (length < BLOG_ANALYSIS_CONSTANTS.MIN_DESCRIPTION_LENGTH) {
      issues.push('설명이 너무 짧습니다');
      suggestions.push(`설명은 최소 ${BLOG_ANALYSIS_CONSTANTS.MIN_DESCRIPTION_LENGTH}자 이상 권장합니다`);
      score = (length / BLOG_ANALYSIS_CONSTANTS.MIN_DESCRIPTION_LENGTH) * 15;
    } else if (length > BLOG_ANALYSIS_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
      issues.push('설명이 너무 깁니다');
      suggestions.push(`설명은 ${BLOG_ANALYSIS_CONSTANTS.MAX_DESCRIPTION_LENGTH}자 이하 권장합니다`);
      score = Math.max(15, 30 - ((length - BLOG_ANALYSIS_CONSTANTS.MAX_DESCRIPTION_LENGTH) * 0.2));
    } else {
      score = 28;
      suggestions.push('설명문 길이가 적절합니다');
    }

    // 의료법 준수 체크
    if (description.includes('개인차가 있을 수 있습니다') || 
        description.includes('전문의와 상담')) {
      score += 2;
      suggestions.push('의료법 준수 표현이 포함되어 좋습니다');
    }

    const isOptimal = length >= BLOG_ANALYSIS_CONSTANTS.MIN_DESCRIPTION_LENGTH && 
                     length <= BLOG_ANALYSIS_CONSTANTS.MAX_DESCRIPTION_LENGTH;

    return {
      length,
      isOptimal,
      score: Math.min(30, Math.max(0, score)),
      issues,
      suggestions
    };
  }

  /**
   * 키워드 밀도 분석
   */
  analyzeKeywordDensity(content: string, keyword: string): KeywordDensityResult {
    const issues: string[] = [];
    
    if (!content || !keyword) {
      return {
        keyword,
        count: 0,
        density: 0,
        isOptimal: false,
        issues: ['콘텐츠 또는 키워드가 없습니다']
      };
    }

    const words = content.match(/\S+/g) || [];
    const totalWords = words.length;
    
    // 키워드 대소문자 무시하고 검색
    const keywordRegex = new RegExp(keyword, 'gi');
    const matches = content.match(keywordRegex) || [];
    const count = matches.length;
    
    const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
    
    let isOptimal = true;
    
    if (density === 0) {
      issues.push('키워드가 발견되지 않았습니다');
      isOptimal = false;
    } else if (density > 20) {
      issues.push('키워드 밀도가 너무 높습니다');
      isOptimal = false;
    } else if (density < 1) {
      issues.push('키워드 밀도가 낮습니다');
      isOptimal = false;
    }

    return {
      keyword,
      count,
      density: Math.round(density * 10) / 10,
      isOptimal,
      issues
    };
  }

  /**
   * 가독성 분석
   */
  analyzeReadability(content: string): ReadabilityResult {
    const issues: string[] = [];
    
    if (!content || content.trim().length === 0) {
      return {
        avgSentenceLength: 0,
        score: 0,
        level: 'poor',
        issues: ['분석할 콘텐츠가 없습니다']
      };
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.match(/\S+/g) || [];
    
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    
    let score: number;
    let level: ReadabilityResult['level'];
    
    if (avgSentenceLength <= 10) {
      score = 15;
      level = 'excellent';
    } else if (avgSentenceLength <= 15) {
      score = 13;
      level = 'good';
    } else if (avgSentenceLength <= 25) {
      score = 10;
      level = 'fair';
      issues.push('문장이 다소 길어 가독성이 떨어질 수 있습니다');
    } else {
      score = 5;
      level = 'poor';
      issues.push('문장이 너무 길어 읽기 어렵습니다');
      issues.push('짧고 명확한 문장으로 나눠주세요');
    }

    return {
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      score,
      level,
      issues
    };
  }
}
