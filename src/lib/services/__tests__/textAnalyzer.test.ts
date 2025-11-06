import { TextAnalyzer } from '../textAnalyzer';
import type { TextAnalysisResult } from '../textAnalyzer';

describe('TextAnalyzer', () => {
  let analyzer: TextAnalyzer;

  beforeEach(() => {
    analyzer = new TextAnalyzer();
  });

  describe('기본 텍스트 분석', () => {
    test('빈 문자열 분석', () => {
      const result = analyzer.analyze('');
      
      expect(result.wordCount).toBe(0);
      expect(result.charCount).toBe(0);
      expect(result.sentences).toBe(0);
      expect(result.avgWordsPerSentence).toBe(0);
    });

    test('단순 텍스트 분석', () => {
      const text = '안녕하세요. 저는 의사입니다. 건강하세요!';
      const result = analyzer.analyze(text);
      
      expect(result.wordCount).toBe(4); // 단어 개수
      expect(result.charCount).toBe(23); // 공백 포함 문자 수
      expect(result.sentences).toBe(3); // 문장 개수
      expect(result.avgWordsPerSentence).toBe(1); // 평균 문장당 단어 수
    });

    test('복잡한 의료 콘텐츠 분석', () => {
      const text = `
        안녕하세요, 서울대병원 정형외과 김의사입니다. 
        오늘은 무릎 관절염 치료에 대해 말씀드리겠습니다.
        무릎 관절염은 나이가 들면서 자연스럽게 발생할 수 있는 질환입니다.
        적절한 치료와 관리를 통해 증상을 완화할 수 있습니다.
        개인차가 있을 수 있으니 전문의와 상담하시기 바랍니다.
      `.trim();
      
      const result = analyzer.analyze(text);
      
      expect(result.wordCount).toBeGreaterThan(20);
      expect(result.sentences).toBe(5);
      expect(result.avgWordsPerSentence).toBeGreaterThan(4);
    });
  });

  describe('제목 분석', () => {
    test('적절한 길이의 제목', () => {
      const result = analyzer.analyzeTitle('무릎 관절염 치료 방법과 예방법 - 서울대병원');
      
      expect(result.length).toBe(25);
      expect(result.isOptimal).toBe(true);
      expect(result.score).toBeGreaterThan(30);
    });

    test('너무 짧은 제목', () => {
      const result = analyzer.analyzeTitle('무릎 치료');
      
      expect(result.length).toBe(5);
      expect(result.isOptimal).toBe(false);
      expect(result.score).toBeLessThan(20);
      expect(result.issues).toContain('제목이 너무 짧습니다');
    });

    test('너무 긴 제목', () => {
      const result = analyzer.analyzeTitle('무릎 관절염의 원인과 증상 그리고 다양한 치료 방법에 대한 상세한 설명과 예방을 위한 생활습관 개선 방법과 운동법까지 포함된 종합 가이드');
      
      expect(result.length).toBeGreaterThan(60);
      expect(result.isOptimal).toBe(false);
      expect(result.score).toBeLessThan(30);
      expect(result.issues).toContain('제목이 너무 깁니다');
    });
  });

  describe('설명문 분석', () => {
    test('적절한 설명문', () => {
      const description = '무릎 관절염의 증상과 치료법을 전문의가 상세히 설명드립니다. 개인차가 있을 수 있습니다.';
      const result = analyzer.analyzeDescription(description);
      
      expect(result.length).toBe(49);
      expect(result.isOptimal).toBe(true);
      expect(result.score).toBeGreaterThan(25);
    });

    test('설명문 없음', () => {
      const result = analyzer.analyzeDescription('');
      
      expect(result.length).toBe(0);
      expect(result.isOptimal).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('메타 설명이 없습니다');
    });

    test('너무 긴 설명문', () => {
      const longDesc = '무릎 관절염'.repeat(30); // 150자 넘김
      const result = analyzer.analyzeDescription(longDesc);
      
      expect(result.length).toBeGreaterThan(160);
      expect(result.isOptimal).toBe(false);
      expect(result.issues).toContain('설명이 너무 깁니다');
    });
  });

  describe('키워드 밀도 분석', () => {
    test('적절한 키워드 밀도', () => {
      const text = '무릎 관절염 치료에 대해 설명합니다. 무릎 관절염은 흔한 질환입니다. 전문적인 치료가 필요합니다.';
      const result = analyzer.analyzeKeywordDensity(text, '무릎');
      
      expect(result.keyword).toBe('무릎');
      expect(result.count).toBe(2);
      expect(result.density).toBeCloseTo(16.7, 1); // 2/12 * 100
      expect(result.isOptimal).toBe(true);
    });

    test('키워드 밀도 너무 높음', () => {
      const text = '무릎 무릎 무릎 치료 무릎 관절염';
      const result = analyzer.analyzeKeywordDensity(text, '무릎');
      
      expect(result.count).toBe(4);
      expect(result.density).toBeGreaterThan(50);
      expect(result.isOptimal).toBe(false);
      expect(result.issues).toContain('키워드 밀도가 너무 높습니다');
    });
  });

  describe('가독성 분석', () => {
    test('좋은 가독성', () => {
      const text = '안녕하세요. 저는 의사입니다. 오늘은 건강에 대해 이야기하겠습니다. 건강한 생활을 위해 규칙적인 운동이 중요합니다.';
      const result = analyzer.analyzeReadability(text);
      
      expect(result.avgSentenceLength).toBeLessThan(20);
      expect(result.score).toBeGreaterThan(12);
      expect(result.level).toBe('excellent');
    });

    test('나쁜 가독성 (긴 문장)', () => {
      const text = '무릎 관절염은 나이가 들면서 관절 연골이 닳아 없어지거나 찢어져서 관절을 이루는 뼈와 인대 등에 염증이 생기고 이로 인해 관절이 아프고 뻣뻣해지는 질환으로 특히 체중이 많이 실리는 무릎 관절에서 자주 발생하며 방치할 경우 일상생활에 큰 불편을 초래할 수 있습니다.';
      const result = analyzer.analyzeReadability(text);
      
      expect(result.avgSentenceLength).toBeGreaterThan(30);
      expect(result.score).toBeLessThan(8);
      expect(result.level).toBe('poor');
    });
  });
});
