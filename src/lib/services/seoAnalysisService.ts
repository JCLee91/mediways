import { TextAnalyzer } from './textAnalyzer';
import { MedicalComplianceChecker } from './medicalComplianceChecker';
import { SEOScoreCalculator } from './seoScoreCalculator';
import { fetchPageContent } from './urlContentFetcher';
import type { SEOScoreResult } from './seoScoreCalculator';
import type { ComplianceResult } from './medicalComplianceChecker';
import type { 
  TextAnalysisResult, 
  TitleAnalysisResult, 
  DescriptionAnalysisResult,
  ReadabilityResult,
  KeywordDensityResult 
} from './textAnalyzer';

// SEO 분석 입력 데이터
export interface SEOAnalysisInput {
  title: string;
  content: string;
  description?: string;
  targetKeywords: string[];
  url?: string;
}

// SEO 분석 결과 데이터
export interface SEOAnalysisResult {
  analysisId: string;
  url?: string;
  overallScore: number;
  grade: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor';
  
  // 개별 요소 분석 결과
  title: TitleAnalysisResult & { score: number };
  content: TextAnalysisResult;
  description?: DescriptionAnalysisResult & { score: number };
  keywords: KeywordDensityResult[];
  readability: ReadabilityResult;
  compliance: ComplianceResult;
  
  // 점수 세부사항
  scoreBreakdown: SEOScoreResult['breakdown'];
  suggestions: string[];
  pageSummary?: {
    title: string;
    description?: string;
    url?: string;
  };

  // 메타데이터
  analyzedAt: Date;
  processingTime: number;
}

// 비교 분석 결과
export interface ComparisonResult {
  before: SEOAnalysisResult;
  after: SEOAnalysisResult;
  scoreImprovement: number;
  improvementAreas: string[];
  regressionAreas: string[];
}

export class SEOAnalysisService {
  private textAnalyzer: TextAnalyzer;
  private complianceChecker: MedicalComplianceChecker;
  private scoreCalculator: SEOScoreCalculator;
  private cache: Map<string, SEOAnalysisResult>;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
    this.complianceChecker = new MedicalComplianceChecker();
    this.scoreCalculator = new SEOScoreCalculator();
    this.cache = new Map();
  }

  /**
   * 전체 SEO 분석 수행
   */
  async analyze(input: SEOAnalysisInput): Promise<SEOAnalysisResult> {
    const startTime = Date.now();
    
    // 입력 유효성 검사
    const validatedInput = this.validateInput(input);
    
    // 캐시 확인
    const cacheKey = this.generateCacheKey(validatedInput);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 개별 분석 수행
      const textAnalysis = this.textAnalyzer.analyze(validatedInput.content);
      const titleAnalysis = validatedInput.title ? 
        this.textAnalyzer.analyzeTitle(validatedInput.title) : null;
      const descriptionAnalysis = validatedInput.description ? 
        this.textAnalyzer.analyzeDescription(validatedInput.description) : null;
      const readabilityAnalysis = this.textAnalyzer.analyzeReadability(validatedInput.content);
      
      // 키워드 분석
      const keywordAnalysisResults: KeywordDensityResult[] = [];
      for (const keyword of validatedInput.targetKeywords) {
        if (keyword && keyword.trim()) {
          const keywordResult = this.textAnalyzer.analyzeKeywordDensity(
            validatedInput.content + ' ' + validatedInput.title, 
            keyword
          );
          keywordAnalysisResults.push(keywordResult);
        }
      }

      // 의료법 준수 검사
      const fullText = [
        validatedInput.title,
        validatedInput.content,
        validatedInput.description || ''
      ].join(' ');
      const complianceResult = this.complianceChecker.check(fullText);

      // SEO 점수 계산
      const scoreResult = this.scoreCalculator.calculateFromContent(
        validatedInput.content,
        validatedInput.title,
        validatedInput.description,
        validatedInput.targetKeywords
      );

      // 빈 입력 처리
      if (!validatedInput.title && !validatedInput.content) {
        return this.createEmptyInputResult(validatedInput, Date.now() - startTime);
      }

      // 결과 구성
      const result: SEOAnalysisResult = {
        analysisId: this.generateAnalysisId(),
        url: validatedInput.url,
        overallScore: scoreResult.overallScore,
        grade: scoreResult.grade,
        title: titleAnalysis ? {
          ...titleAnalysis,
          score: scoreResult.breakdown.title
        } : {
          length: validatedInput.title.length,
          score: 0,
          isOptimal: false,
          issues: ['제목이 없습니다'],
          suggestions: []
        },
        content: textAnalysis,
        description: descriptionAnalysis ? {
          ...descriptionAnalysis,
          score: scoreResult.breakdown.description
        } : undefined,
        keywords: keywordAnalysisResults.map(keyword => {
          const detail = scoreResult.keywordDetails?.find(detail => detail.keyword === keyword.keyword);
          return detail ? { ...keyword, isOptimal: detail.isOptimal, density: detail.density } : keyword;
        }),
        readability: readabilityAnalysis,
        compliance: complianceResult,
        scoreBreakdown: scoreResult.breakdown,
        suggestions: this.generateComprehensiveSuggestions(
          validatedInput,
          scoreResult,
          complianceResult
        ),
        analyzedAt: new Date(),
        processingTime: Date.now() - startTime
      };

      // 캐시 저장
      this.cache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      return this.createErrorResult(validatedInput, error as Error, Date.now() - startTime);
    }
  }

  /**
   * URL 기반 분석 (현재는 기본 구현, 향후 크롤링 기능 추가)
   */
  async analyzeUrl(url: string): Promise<SEOAnalysisResult> {
    const page = await fetchPageContent(url);

    if (!page) {
      return this.analyze({
        title: '',
        content: '',
        targetKeywords: [],
        url
      });
    }

    const result = await this.analyze({
      title: page.title || '',
      content: page.content || '',
      description: page.description,
      targetKeywords: [],
      url
    });

    return {
      ...result,
      pageSummary: {
        title: page.title || '',
        description: page.description,
        url
      }
    };
  }

  /**
   * 배치 분석
   */
  async analyzeBatch(inputs: SEOAnalysisInput[]): Promise<SEOAnalysisResult[]> {
    const results: SEOAnalysisResult[] = [];
    
    for (const input of inputs) {
      try {
        const result = await this.analyze(input);
        results.push(result);
      } catch (error) {
        const errorResult = this.createErrorResult(input, error as Error, 0);
        results.push(errorResult);
      }
    }
    
    return results;
  }

  /**
   * 비교 분석
   */
  async compareAnalysis(before: SEOAnalysisInput, after: SEOAnalysisInput): Promise<ComparisonResult> {
    const beforeResult = await this.analyze(before);
    const afterResult = await this.analyze(after);
    
    const scoreImprovement = afterResult.overallScore - beforeResult.overallScore;
    
    const improvementAreas: string[] = [];
    const regressionAreas: string[] = [];
    
    // 각 영역별 개선/악화 확인
    if (afterResult.title.score > beforeResult.title.score) {
      improvementAreas.push('title');
    } else if (afterResult.title.score < beforeResult.title.score) {
      regressionAreas.push('title');
    }
    
    if (afterResult.scoreBreakdown.content > beforeResult.scoreBreakdown.content) {
      improvementAreas.push('content');
    } else if (afterResult.scoreBreakdown.content < beforeResult.scoreBreakdown.content) {
      regressionAreas.push('content');
    }
    
    if (afterResult.scoreBreakdown.compliance > beforeResult.scoreBreakdown.compliance) {
      improvementAreas.push('compliance');
    } else if (afterResult.scoreBreakdown.compliance < beforeResult.scoreBreakdown.compliance) {
      regressionAreas.push('compliance');
    }
    
    if (afterResult.readability.score > beforeResult.readability.score) {
      improvementAreas.push('readability');
    } else if (afterResult.readability.score < beforeResult.readability.score) {
      regressionAreas.push('readability');
    }

    return {
      before: beforeResult,
      after: afterResult,
      scoreImprovement,
      improvementAreas,
      regressionAreas
    };
  }

  /**
   * 입력 유효성 검사
   */
  private validateInput(input: SEOAnalysisInput): SEOAnalysisInput {
    return {
      title: input.title || '',
      content: input.content || '',
      description: input.description,
      targetKeywords: (input.targetKeywords || []).filter(k => k && k.trim()),
      url: input.url
    };
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(input: SEOAnalysisInput): string {
    const data = {
      title: input.title,
      content: input.content,
      description: input.description,
      keywords: input.targetKeywords.sort()
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * 분석 ID 생성
   */
  private generateAnalysisId(): string {
    return `seo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 종합적인 개선 제안사항 생성
   */
  private generateComprehensiveSuggestions(
    input: SEOAnalysisInput,
    scoreResult: SEOScoreResult,
    complianceResult: ComplianceResult
  ): string[] {
    const suggestions = [...scoreResult.suggestions];

    // 입력값 기반 추가 제안
    if (!input.title || input.title.trim().length === 0) {
      suggestions.push('제목을 입력해주세요');
    }
    
    if (!input.content || input.content.trim().length === 0) {
      suggestions.push('콘텐츠를 입력해주세요');
    }
    
    if (!input.description) {
      suggestions.push('메타 설명을 추가하면 SEO 효과가 향상됩니다');
    }
    
    if (input.targetKeywords.length === 0) {
      suggestions.push('타겟 키워드를 설정해주세요');
    }

    // 의료법 준수 관련 제안 추가
    if (complianceResult.violations.length > 0) {
      suggestions.push('의료법 준수가 필수입니다. 위반 표현을 수정해주세요');
    }
    
    if (complianceResult.missingRequirements.length > 0) {
      suggestions.push('필수 고지사항을 추가해주세요');
    }

    // 중복 제거 및 정렬
    return [...new Set(suggestions)].sort();
  }

  /**
   * 빈 입력 결과 생성
   */
  private createEmptyInputResult(input: SEOAnalysisInput, processingTime: number): SEOAnalysisResult {
    return {
      analysisId: this.generateAnalysisId(),
      url: input.url,
      overallScore: 0,
      grade: 'poor',
      title: {
        length: 0,
        score: 0,
        isOptimal: false,
        issues: ['제목을 입력해주세요'],
        suggestions: []
      },
      content: {
        wordCount: 0,
        charCount: 0,
        sentences: 0,
        avgWordsPerSentence: 0
      },
      keywords: [],
      readability: {
        score: 0,
        level: 'poor',
        avgSentenceLength: 0,
        issues: ['콘텐츠를 입력해주세요']
      },
      compliance: {
        isCompliant: false,
        violations: [],
        missingRequirements: [],
        violationTypes: [],
        complianceScore: 0,
        suggestions: []
      },
      scoreBreakdown: {
        title: 0,
        content: 0,
        description: 0,
        keywords: 0,
        readability: 0,
        compliance: 0
      },
      suggestions: [
        '제목을 입력해주세요',
        '콘텐츠를 입력해주세요'
      ],
      analyzedAt: new Date(),
      processingTime
    };
  }

  /**
   * 에러 결과 생성
   */
  private createErrorResult(input: SEOAnalysisInput, error: Error, processingTime: number): SEOAnalysisResult {
    return {
      analysisId: this.generateAnalysisId(),
      url: input.url,
      overallScore: 0,
      grade: 'poor',
      title: {
        length: 0,
        score: 0,
        isOptimal: false,
        issues: ['분석 오류가 발생했습니다'],
        suggestions: []
      },
      content: {
        wordCount: 0,
        charCount: 0,
        sentences: 0,
        avgWordsPerSentence: 0
      },
      keywords: [],
      readability: {
        score: 0,
        level: 'poor',
        avgSentenceLength: 0,
        issues: ['분석 오류']
      },
      compliance: {
        isCompliant: false,
        violations: [],
        missingRequirements: [],
        violationTypes: [],
        complianceScore: 0,
        suggestions: []
      },
      scoreBreakdown: {
        title: 0,
        content: 0,
        description: 0,
        keywords: 0,
        readability: 0,
        compliance: 0
      },
      suggestions: [
        `분석 중 오류가 발생했습니다: ${error.message}`,
        '입력 데이터를 확인하고 다시 시도해주세요'
      ],
      analyzedAt: new Date(),
      processingTime
    };
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
