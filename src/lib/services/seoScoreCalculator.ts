import { TextAnalyzer } from './textAnalyzer';
import { MedicalComplianceChecker } from './medicalComplianceChecker';

// SEO 요소들 타입
export interface SEOFactors {
  titleLength: number;
  contentLength: number;
  keywordDensity: number;
  hasDescription: boolean;
  descriptionLength?: number;
  descriptionQuality?: number; // 키워드 포함, 호출유도문구 등
  readabilityScore: number;
  medicalCompliance: boolean;
  hasRequiredStatements: boolean;
  keywordDetails?: Array<{ keyword: string; density: number; isOptimal: boolean }>;
}

// SEO 점수 세부 결과
export interface SEOScoreBreakdown {
  title: number;        // 제목 점수 (20점)
  content: number;      // 콘텐츠 점수 (15점)
  description: number;  // 설명 점수 (10점)
  keywords: number;     // 키워드 점수 (10점)
  readability: number;  // 가독성 점수 (15점)
  compliance: number;   // 의료법 준수 점수 (30점)
}

export interface SEOScoreResult {
  overallScore: number;
  breakdown: SEOScoreBreakdown;
  grade: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor';
  suggestions: string[];
  keywordDetails?: Array<{ keyword: string; density: number; isOptimal: boolean }>;
}

export class SEOScoreCalculator {
  private textAnalyzer: TextAnalyzer;
  private complianceChecker: MedicalComplianceChecker;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
    this.complianceChecker = new MedicalComplianceChecker();
  }

  /**
   * SEO 요소들을 기반으로 전체 점수 계산
   */
  calculate(factors: SEOFactors): SEOScoreResult {
    const breakdown: SEOScoreBreakdown = {
      title: this.calculateTitleScore(factors.titleLength),
      content: this.calculateContentScore(factors.contentLength),
      description: this.calculateDescriptionScore(factors.hasDescription, factors.descriptionLength, factors.descriptionQuality),
      keywords: this.calculateKeywordScore(factors.keywordDensity),
      readability: factors.readabilityScore,
      compliance: this.calculateComplianceScore(factors.medicalCompliance, factors.hasRequiredStatements)
    };

    const overallScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    const grade = this.getScoreGrade(overallScore);
    const suggestions = this.generateSuggestions(factors, breakdown);

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      breakdown,
      grade,
      suggestions,
      keywordDetails: factors.keywordDetails
    };
  }

  /**
   * 제목 길이 기반 점수 계산 (0-20점)
   * 2024 SEO 기준: Google SERP 표시 최적화 + 클릭률 고려
   */
  calculateTitleScore(length: number): number {
    if (length === 0) return 0;
    
    if (length >= 30 && length <= 60) {
      return 20;
    }
    
    if ((length >= 25 && length < 30) || (length > 60 && length <= 70)) {
      return 15;
    }
    
    if ((length >= 20 && length < 25) || (length > 70 && length <= 80)) {
      return 10;
    }
    
    if ((length >= 15 && length < 20) || (length > 80 && length <= 90)) {
      return 6;
    }
    
    if ((length >= 10 && length < 15) || (length > 90 && length <= 110)) {
      return 3;
    }
    
    // 14자 이하 또는 100자 초과 (불충분)
    return 1;
  }

  /**
   * 콘텐츠 길이 기반 점수 계산 (0-15점)
   * 2024 SEO 기준: 의료 콘텐츠는 E-A-T 품질을 위해 충분한 깊이 필요
   */
  calculateContentScore(length: number): number {
    if (length >= 300) {
      return 15; // MVP 기준: 300자 이상이면 충분한 길이로 간주
    }
    if (length >= 200) {
      return 12;
    }
    if (length >= 150) {
      return 9;
    }
    if (length >= 100) {
      return 6;
    }
    if (length >= 50) {
      return 3;
    }
    return 0;
  }

  /**
   * 메타 설명 품질 기반 점수 계산 (0-10점)
   * 2024 SEO 기준: 길이 + 품질 + 키워드 포함도
   */
  calculateDescriptionScore(hasDescription: boolean, length?: number, quality?: number): number {
    if (!hasDescription) {
      return 0;
    }

    // 길이 정보가 없으면 기본 만점 처리 (MVP 시나리오)
    if (!length) {
      return 10;
    }

    if (length >= 60 && length <= 220) {
      return 10;
    }

    let score = 6;

    if (length > 220) {
      score = 8;
    } else if (length < 60) {
      score = 6;
    }

    if (quality !== undefined) {
      score += Math.min(4, quality);
    } else {
      score += 4;
    }

    return Math.min(10, score);
  }

  /**
   * 키워드 밀도 기반 점수 계산 (0-10점)
   * 2024 SEO 기준: 자연스러운 언어 사용 + 의미적 SEO 중심
   */
  calculateKeywordScore(density: number): number {
    if (density <= 0) {
      return 0;
    }

    if (density >= 1 && density <= 3) {
      return 10;
    }

    if (density >= 0.8 && density < 1) {
      return 8;
    }

    if ((density > 3 && density <= 5) || (density >= 0.5 && density < 0.8)) {
      return 6;
    }

    if (density > 5 && density <= 7) {
      return 4;
    }

    if (density > 7) {
      return 2;
    }

    // 0 < density < 0.5
    return 3;
  }

  /**
   * 의료법 준수 점수 계산 (0-30점)
   */
  calculateComplianceScore(medicalCompliance: boolean, hasRequiredStatements: boolean): number {
    let score = 0;
    
    if (medicalCompliance) {
      score += 20; // 기본 준수 20점
    }
    
    if (hasRequiredStatements) {
      score += 10; // 필수 고지사항 10점
    }
    
    return score;
  }

  /**
   * 점수를 등급으로 변환
   */
  getScoreGrade(score: number): SEOScoreResult['grade'] {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'needs_improvement';
    return 'poor';
  }

  /**
   * 개선 제안사항 생성
   */
  private generateSuggestions(factors: SEOFactors, breakdown: SEOScoreBreakdown): string[] {
    const suggestions: string[] = [];

    // 제목 관련 제안
    if (breakdown.title < 15) {
      if (factors.titleLength < 30) {
        suggestions.push('제목을 30-60자로 최적화하세요');
      } else if (factors.titleLength > 60) {
        suggestions.push('제목을 60자 이내로 줄이세요');
      }
    }

    // 콘텐츠 관련 제안 (2024 기준)
    if (breakdown.content < 10) {
      suggestions.push('콘텐츠 길이를 300자 이상으로 늘리세요');
    } else if (breakdown.content < 15) {
      suggestions.push('콘텐츠 길이를 500자 이상으로 늘리세요');
    }

    // 설명 관련 제안
    if (breakdown.description === 0) {
      suggestions.push('메타 설명을 추가하세요');
    }

    // 키워드 관련 제안 (2024 기준)
    if (breakdown.keywords < 8 || factors.keywordDensity === 0) {
      if (factors.keywordDensity === 0) {
        suggestions.push('주요 키워드를 적절히 포함시키세요');
      } else if (factors.keywordDensity > 5) {
        suggestions.push('키워드 사용을 줄여주세요');
      } else {
        suggestions.push('키워드 밀도를 1-3% 범위로 유지하세요');
      }
    }

    // 가독성 관련 제안
    if (breakdown.readability < 10) {
      suggestions.push('문장을 짧고 명확하게 작성하세요');
    }

    // 의료법 준수 관련 제안
    if (breakdown.compliance < 25) {
      if (!factors.medicalCompliance) {
        suggestions.push('의료법 준수가 필수입니다');
      }
      if (!factors.hasRequiredStatements) {
        suggestions.push('필수 고지사항을 추가하세요');
      }
    }

    return suggestions;
  }

  /**
   * 실제 콘텐츠를 분석하여 SEO 점수 계산
   */
  calculateFromContent(content: string, title?: string, description?: string, targetKeywords: string[] = []): SEOScoreResult {
    // 텍스트 분석
    const textAnalysis = this.textAnalyzer.analyze(content);
    const readabilityAnalysis = this.textAnalyzer.analyzeReadability(content);
    
    // 의료법 준수 검사
    const complianceResult = this.complianceChecker.check(content + (title || '') + (description || ''));
    
    // 키워드 밀도 계산 (주요 의료 키워드 기준)
    const { averageDensity, keywordDetails } = this.calculateKeywordDensityDetails(content, targetKeywords);
    
    // Description 길이 계산 (분석 객체 생성 없이)
    const descriptionLength = description ? description.length : 0;

    // SEO 요소 구성
    const factors: SEOFactors = {
      titleLength: title ? title.length : 0,
      contentLength: content.length,
      keywordDensity: averageDensity,
      hasDescription: !!description && description.length > 0,
      descriptionLength: descriptionLength || undefined,
      readabilityScore: readabilityAnalysis.score,
      medicalCompliance: complianceResult.violations.length === 0,
      hasRequiredStatements: complianceResult.missingRequirements.length === 0,
      keywordDetails
    };

    return this.calculate(factors);
  }

  /**
   * 키워드 밀도 세부 계산
   */
  private calculateKeywordDensityDetails(content: string, targetKeywords: string[]): {
    averageDensity: number;
    keywordDetails: Array<{ keyword: string; density: number; isOptimal: boolean }>;
  } {
    const keywordsToEvaluate = targetKeywords.length > 0
      ? targetKeywords
      : ['치료', '병원', '의원', '상담', '진료', '검진'];

    const keywordDetails: Array<{ keyword: string; density: number; isOptimal: boolean }> = [];
    let totalDensity = 0;
    let validKeywordCount = 0;

    for (const keyword of keywordsToEvaluate) {
      try {
        const keywordResult = this.textAnalyzer.analyzeKeywordDensity(content, keyword);
        keywordDetails.push({
          keyword,
          density: keywordResult.density,
          isOptimal: keywordResult.isOptimal
        });

        if (keywordResult.density > 0) {
          totalDensity += keywordResult.density;
          validKeywordCount++;
        }
      } catch {
        keywordDetails.push({ keyword, density: 0, isOptimal: false });
      }
    }

    return {
      averageDensity: validKeywordCount > 0 ? totalDensity / validKeywordCount : 0,
      keywordDetails
    };
  }

  /**
   * 간단한 URL 분석 (향후 확장 가능)
   */
  async analyzeUrl(url: string): Promise<SEOScoreResult> {
    // 현재는 기본값 반환 (향후 크롤링 기능 추가 시 확장)
    return this.calculate({
      titleLength: 0,
      contentLength: 0,
      keywordDensity: 0,
      hasDescription: false,
      readabilityScore: 0,
      medicalCompliance: false,
      hasRequiredStatements: false
    });
  }
}
