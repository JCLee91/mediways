import { SEOAnalysisService } from '../seoAnalysisService';
import type { SEOAnalysisInput } from '../seoAnalysisService';

describe('SEOAnalysisService', () => {
  let service: SEOAnalysisService;

  beforeEach(() => {
    service = new SEOAnalysisService();
  });

  describe('전체 SEO 분석', () => {
    test('완벽한 의료 콘텐츠 분석', async () => {
      const input: SEOAnalysisInput = {
        title: '무릎 관절염 치료 방법 - 전문의가 알려주는 효과적인 관리법',
        content: `
          무릎 관절염은 나이가 들면서 자연스럽게 발생할 수 있는 질환입니다.
          
          적절한 치료와 꾸준한 관리를 통해 증상을 완화할 수 있습니다.
          물리치료, 약물치료, 주사치료 등 다양한 치료 옵션이 있습니다.
          
          각 환자의 상태에 따라 개별적인 치료 계획을 수립하게 됩니다.
          정기적인 검진과 전문의 상담을 통해 최적의 치료 효과를 얻을 수 있습니다.
          
          개인차가 있을 수 있으며, 전문의와 상담하시기 바랍니다.
          모든 치료에는 부작용이 있을 수 있습니다.
        `.trim(),
        description: '무릎 관절염의 다양한 치료법을 전문의가 상세히 설명합니다. 개인차가 있을 수 있습니다.',
        targetKeywords: ['무릎 관절염', '치료', '전문의']
      };

      const result = await service.analyze(input);

      expect(result.overallScore).toBeGreaterThan(85);
      expect(result.title.score).toBeGreaterThan(18);
      expect(result.content.wordCount).toBeGreaterThan(50);
      expect(result.compliance.isCompliant).toBe(true);
      expect(result.compliance.violations).toHaveLength(0);
      expect(result.keywords.some((k: {density: number}) => k.density > 0)).toBe(true);
    });

    test('의료법 위반 콘텐츠 분석', async () => {
      const input: SEOAnalysisInput = {
        title: '100% 완치 보장하는 최고의 병원',
        content: `
          저희 병원은 100% 완치를 보장합니다.
          다른 병원보다 뛰어난 최고의 치료 결과를 제공합니다.
          부작용은 전혀 없으며 절대 안전한 치료입니다.
          1위 병원에서만 받을 수 있는 특별한 치료법입니다.
        `.trim(),
        description: '최고 수준의 치료로 100% 완치 보장',
        targetKeywords: ['치료', '병원']
      };

      const result = await service.analyze(input);

      expect(result.overallScore).toBeLessThanOrEqual(50);
      expect(result.compliance.isCompliant).toBe(false);
      expect(result.compliance.violations.some((v: string) => v.includes('100% 완치'))).toBe(true);
      expect(result.compliance.violations.some((v: string) => v.includes('최고의 병원'))).toBe(true);
      expect(result.suggestions.some((s: string) => s.includes('의료법 준수'))).toBe(true);
    });

    test('부족한 콘텐츠 분석', async () => {
      const input: SEOAnalysisInput = {
        title: '치료',
        content: '병원입니다.',
        targetKeywords: ['치료']
      };

      const result = await service.analyze(input);

      expect(result.overallScore).toBeLessThan(40);
      expect(result.content.wordCount).toBeLessThan(10);
      expect(result.suggestions.some((s: string) => s.includes('콘텐츠 길이'))).toBe(true);
    });
  });

  describe('개별 요소 분석', () => {
    test('제목 분석', async () => {
      const input: SEOAnalysisInput = {
        title: '무릎 관절염 전문 치료 - 개인 맞춤형 치료 계획으로 건강한 일상 회복',
        content: '기본 콘텐츠입니다.',
        targetKeywords: ['무릎 관절염', '치료']
      };

      const result = await service.analyze(input);

      expect(result.title.length).toBe(input.title.length);
      expect(result.title.score).toBeGreaterThan(15);
    });

    test('콘텐츠 분석', async () => {
      const longContent = '병원에서 치료를 받으시기 바랍니다. '.repeat(50);
      const input: SEOAnalysisInput = {
        title: '제목',
        content: longContent,
        targetKeywords: ['치료']
      };

      const result = await service.analyze(input);

      expect(result.content.wordCount).toBeGreaterThan(100);
      expect(result.content.sentences).toBeGreaterThan(40);
      expect(result.readability.score).toBeGreaterThan(10);
    });

    test('키워드 분석', async () => {
      const input: SEOAnalysisInput = {
        title: '무릎 관절염 치료 전문 병원',
        content: '무릎 관절염 치료를 전문으로 하는 병원입니다. 관절염 치료에 대한 풍부한 경험을 가지고 있습니다.',
        targetKeywords: ['무릎 관절염', '치료', '병원']
      };

      const result = await service.analyze(input);

      expect(result.keywords).toHaveLength(3);
      expect(result.keywords.find((k: {keyword: string}) => k.keyword === '무릎 관절염')).toBeDefined();
      expect(result.keywords.find((k: {keyword: string}) => k.keyword === '치료')).toBeDefined();
      expect(result.keywords.find((k: {keyword: string}) => k.keyword === '병원')).toBeDefined();
    });
  });

  describe('URL 분석', () => {
    test('URL 입력 처리', async () => {
      const url = 'https://example.com/knee-arthritis-treatment';
      
      // URL 분석은 현재 기본값 반환 (향후 확장)
      const result = await service.analyzeUrl(url);
      
      expect(result).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.url).toBe(url);
    });
  });

  describe('배치 분석', () => {
    test('여러 콘텐츠 동시 분석', async () => {
      const inputs: SEOAnalysisInput[] = [
        {
          title: '관절염 치료법',
          content: '관절염 치료에 대한 내용입니다. 개인차가 있을 수 있습니다.',
          targetKeywords: ['관절염', '치료']
        },
        {
          title: '피부과 전문 진료',
          content: '피부과 전문의가 진료합니다. 전문의와 상담하시기 바랍니다.',
          targetKeywords: ['피부과', '진료']
        }
      ];

      const results = await service.analyzeBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].keywords.some((k: {keyword: string}) => k.keyword === '치료')).toBe(true);
      expect(results[1].keywords.some((k: {keyword: string}) => k.keyword === '진료')).toBe(true);
    });
  });

  describe('비교 분석', () => {
    test('before/after 콘텐츠 비교', async () => {
      const beforeInput: SEOAnalysisInput = {
        title: '병원',
        content: '100% 완치됩니다.',
        targetKeywords: ['병원']
      };

      const afterInput: SEOAnalysisInput = {
        title: '관절염 치료 전문 병원 - 개인 맞춤 치료',
        content: '관절염 치료를 전문으로 합니다. 개인차가 있을 수 있으며, 전문의와 상담하시기 바랍니다.',
        targetKeywords: ['관절염', '치료', '병원']
      };

      const comparison = await service.compareAnalysis(beforeInput, afterInput);

      expect(comparison.scoreImprovement).toBeGreaterThan(0);
      expect(comparison.before.overallScore).toBeLessThan(comparison.after.overallScore);
      expect(comparison.improvementAreas).toContain('title');
      expect(comparison.improvementAreas).toContain('compliance');
    });
  });

  describe('성능 메트릭', () => {
    test('분석 시간 측정', async () => {
      const input: SEOAnalysisInput = {
        title: '테스트 제목',
        content: '테스트 콘텐츠입니다.',
        targetKeywords: ['테스트']
      };

      const startTime = Date.now();
      await service.analyze(input);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1초 미만
    });

    test('메모리 사용량 최적화', async () => {
      const largeContent = 'A'.repeat(10000);
      const input: SEOAnalysisInput = {
        title: '대용량 콘텐츠 테스트',
        content: largeContent,
        targetKeywords: ['테스트']
      };

      // 메모리 누수 없이 처리되어야 함
      const result = await service.analyze(input);
      expect(result).toBeDefined();
    });
  });

  describe('에러 처리', () => {
    test('빈 입력 처리', async () => {
      const input: SEOAnalysisInput = {
        title: '',
        content: '',
        targetKeywords: []
      };

      const result = await service.analyze(input);

      expect(result.overallScore).toBe(0);
      expect(result.suggestions.some((s: string) => s.includes('제목을 입력'))).toBe(true);
      expect(result.suggestions.some((s: string) => s.includes('콘텐츠를 입력'))).toBe(true);
    });

    test('잘못된 키워드 처리', async () => {
      const input: SEOAnalysisInput = {
        title: '테스트 제목',
        content: '테스트 콘텐츠',
        targetKeywords: ['', null as any, undefined as any].filter(Boolean)
      };

      const result = await service.analyze(input);

      expect(result.keywords).toHaveLength(0);
      expect(result).toBeDefined();
    });
  });

  describe('캐싱 기능', () => {
    test('동일한 입력에 대한 캐싱', async () => {
      const input: SEOAnalysisInput = {
        title: '캐싱 테스트',
        content: '동일한 콘텐츠입니다.',
        targetKeywords: ['테스트']
      };

      const result1 = await service.analyze(input);
      const result2 = await service.analyze(input);

      expect(result1.overallScore).toBe(result2.overallScore);
      expect(result1.analysisId).toBe(result2.analysisId); // 캐시된 결과
    });
  });
});
