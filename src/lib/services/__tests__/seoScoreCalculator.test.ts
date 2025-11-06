import { SEOScoreCalculator } from '../seoScoreCalculator';
import type { SEOFactors, SEOScoreResult } from '../seoScoreCalculator';

describe('SEOScoreCalculator', () => {
  let calculator: SEOScoreCalculator;

  beforeEach(() => {
    calculator = new SEOScoreCalculator();
  });

  describe('전체 SEO 점수 계산', () => {
    test('완벽한 SEO 요소들로 만점 달성', () => {
      const factors: SEOFactors = {
        titleLength: 45,           // 적절한 제목 길이
        contentLength: 500,        // 충분한 콘텐츠 길이
        keywordDensity: 2.5,       // 적절한 키워드 밀도
        hasDescription: true,       // 메타 설명 존재
        readabilityScore: 15,      // 최고 가독성
        medicalCompliance: true,    // 의료법 준수
        hasRequiredStatements: true // 필수 고지사항
      };

      const result = calculator.calculate(factors);
      
      expect(result.overallScore).toBe(100);
      expect(result.breakdown.title).toBe(20);
      expect(result.breakdown.content).toBe(15);
      expect(result.breakdown.description).toBe(10);
      expect(result.breakdown.keywords).toBe(10);
      expect(result.breakdown.readability).toBe(15);
      expect(result.breakdown.compliance).toBe(30);
    });

    test('평균적인 SEO 요소들', () => {
      const factors: SEOFactors = {
        titleLength: 35,
        contentLength: 200,
        keywordDensity: 1.5,
        hasDescription: true,
        readabilityScore: 10,
        medicalCompliance: true,
        hasRequiredStatements: false
      };

      const result = calculator.calculate(factors);
      
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.overallScore).toBeLessThan(90);
    });

    test('최악의 SEO 요소들', () => {
      const factors: SEOFactors = {
        titleLength: 5,             // 너무 짧은 제목
        contentLength: 50,          // 부족한 콘텐츠
        keywordDensity: 0,          // 키워드 없음
        hasDescription: false,      // 설명 없음
        readabilityScore: 3,        // 나쁜 가독성
        medicalCompliance: false,   // 의료법 위반
        hasRequiredStatements: false
      };

      const result = calculator.calculate(factors);
      
      expect(result.overallScore).toBeLessThan(30);
    });
  });

  describe('제목 점수 계산', () => {
    test('적절한 제목 길이 (30-60자)', () => {
      const score = calculator.calculateTitleScore(45);
      expect(score).toBe(20);
    });

    test('너무 짧은 제목', () => {
      const score = calculator.calculateTitleScore(8);
      expect(score).toBeLessThan(15);
    });

    test('너무 긴 제목', () => {
      const score = calculator.calculateTitleScore(80);
      expect(score).toBeLessThan(15);
    });

    test('극단적으로 짧은 제목', () => {
      const score = calculator.calculateTitleScore(2);
      expect(score).toBeLessThan(5);
    });
  });

  describe('콘텐츠 점수 계산', () => {
    test('충분한 콘텐츠 길이', () => {
      const score = calculator.calculateContentScore(400);
      expect(score).toBe(15);
    });

    test('최소 콘텐츠 길이', () => {
      const score = calculator.calculateContentScore(300);
      expect(score).toBe(15);
    });

    test('부족한 콘텐츠', () => {
      const score = calculator.calculateContentScore(150);
      expect(score).toBeLessThan(10);
    });

    test('매우 짧은 콘텐츠', () => {
      const score = calculator.calculateContentScore(50);
      expect(score).toBeLessThan(5);
    });
  });

  describe('키워드 밀도 점수 계산', () => {
    test('적절한 키워드 밀도 (1-3%)', () => {
      expect(calculator.calculateKeywordScore(1.5)).toBe(10);
      expect(calculator.calculateKeywordScore(2.0)).toBe(10);
      expect(calculator.calculateKeywordScore(3.0)).toBe(10);
    });

    test('키워드 없음', () => {
      const score = calculator.calculateKeywordScore(0);
      expect(score).toBe(0);
    });

    test('키워드 밀도 너무 높음', () => {
      const score = calculator.calculateKeywordScore(8);
      expect(score).toBeLessThan(5);
    });

    test('키워드 밀도 너무 낮음', () => {
      const score = calculator.calculateKeywordScore(0.5);
      expect(score).toBeLessThan(8);
    });
  });

  describe('의료법 준수 점수 계산', () => {
    test('완전 준수', () => {
      const score = calculator.calculateComplianceScore(true, true);
      expect(score).toBe(30);
    });

    test('의료법 준수하지만 필수 고지사항 누락', () => {
      const score = calculator.calculateComplianceScore(true, false);
      expect(score).toBe(20);
    });

    test('의료법 위반', () => {
      const score = calculator.calculateComplianceScore(false, true);
      expect(score).toBe(10);
    });

    test('완전 미준수', () => {
      const score = calculator.calculateComplianceScore(false, false);
      expect(score).toBe(0);
    });
  });

  describe('점수별 등급 분류', () => {
    test('우수 등급 (90-100점)', () => {
      const grade = calculator.getScoreGrade(95);
      expect(grade).toBe('excellent');
    });

    test('양호 등급 (80-89점)', () => {
      const grade = calculator.getScoreGrade(85);
      expect(grade).toBe('good');
    });

    test('보통 등급 (70-79점)', () => {
      const grade = calculator.getScoreGrade(75);
      expect(grade).toBe('fair');
    });

    test('개선필요 등급 (60-69점)', () => {
      const grade = calculator.getScoreGrade(65);
      expect(grade).toBe('needs_improvement');
    });

    test('불량 등급 (60점 미만)', () => {
      const grade = calculator.getScoreGrade(45);
      expect(grade).toBe('poor');
    });
  });

  describe('개선 제안사항 생성', () => {
    test('제목 관련 제안', () => {
      const factors: SEOFactors = {
        titleLength: 5,
        contentLength: 300,
        keywordDensity: 2,
        hasDescription: true,
        readabilityScore: 12,
        medicalCompliance: true,
        hasRequiredStatements: true
      };

      const result = calculator.calculate(factors);
      expect(result.suggestions).toContain('제목을 30-60자로 최적화하세요');
    });

    test('콘텐츠 길이 관련 제안', () => {
      const factors: SEOFactors = {
        titleLength: 40,
        contentLength: 100,
        keywordDensity: 2,
        hasDescription: true,
        readabilityScore: 12,
        medicalCompliance: true,
        hasRequiredStatements: true
      };

      const result = calculator.calculate(factors);
      expect(result.suggestions).toContain('콘텐츠 길이를 300자 이상으로 늘리세요');
    });

    test('키워드 밀도 관련 제안', () => {
      const factors: SEOFactors = {
        titleLength: 40,
        contentLength: 400,
        keywordDensity: 0,
        hasDescription: true,
        readabilityScore: 12,
        medicalCompliance: true,
        hasRequiredStatements: true
      };

      const result = calculator.calculate(factors);
      expect(result.suggestions).toContain('주요 키워드를 적절히 포함시키세요');
    });

    test('의료법 준수 관련 제안', () => {
      const factors: SEOFactors = {
        titleLength: 40,
        contentLength: 400,
        keywordDensity: 2,
        hasDescription: true,
        readabilityScore: 12,
        medicalCompliance: false,
        hasRequiredStatements: false
      };

      const result = calculator.calculate(factors);
      expect(result.suggestions).toContain('의료법 준수가 필수입니다');
      expect(result.suggestions).toContain('필수 고지사항을 추가하세요');
    });
  });

  describe('실제 콘텐츠 기반 계산', () => {
    test('실제 의료 블로그 콘텐츠 분석', () => {
      const content = `
        무릎 관절염 치료 방법과 예방법에 대해 알아보겠습니다.
        
        무릎 관절염은 연령이 증가하면서 자연스럽게 발생할 수 있는 질환입니다.
        적절한 치료와 관리를 통해 증상을 완화할 수 있습니다.
        
        치료 방법으로는 약물 치료, 물리 치료, 주사 치료 등이 있습니다.
        각 환자의 상태에 따라 맞춤형 치료 계획을 수립합니다.
        
        개인차가 있을 수 있으며, 전문의와 상담하시기 바랍니다.
        모든 치료에는 부작용이 있을 수 있습니다.
      `.trim();

      const title = '무릎 관절염 치료 방법과 예방법 - 전문의 상담';
      const description = '무릎 관절염의 다양한 치료법을 전문의가 설명합니다. 개인차가 있을 수 있습니다.';
      
      const result = calculator.calculateFromContent(content, title, description);
      
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.breakdown.compliance).toBeGreaterThan(25);
    });
  });
});
