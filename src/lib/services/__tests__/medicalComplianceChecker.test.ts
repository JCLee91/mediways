import { MedicalComplianceChecker } from '../medicalComplianceChecker';
import type { ComplianceResult } from '../medicalComplianceChecker';

describe('MedicalComplianceChecker', () => {
  let checker: MedicalComplianceChecker;

  beforeEach(() => {
    checker = new MedicalComplianceChecker();
  });

  describe('치료 효과 보장 금지 검증', () => {
    test('100% 치료 표현 감지', () => {
      const content = '저희 병원은 100% 치료가 가능합니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('100% 치료');
      expect(result.violationTypes).toContain('treatment_guarantee');
    });

    test('완치 보장 표현 감지', () => {
      const content = '완치 보장하는 유일한 병원입니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('완치 보장');
      expect(result.violationTypes).toContain('treatment_guarantee');
    });

    test('절대 효과 표현 감지', () => {
      const content = '절대 안전한 수술 방법입니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('절대 안전');
      expect(result.violationTypes).toContain('absolute_claim');
    });
  });

  describe('부작용 관련 금지 표현 검증', () => {
    test('부작용 없음 표현 감지', () => {
      const content = '이 시술은 부작용이 전혀 없습니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('부작용이 전혀 없습니다');
      expect(result.violationTypes).toContain('no_side_effects');
    });

    test('100% 안전 표현 감지', () => {
      const content = '100% 안전한 치료법입니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('100% 안전');
      expect(result.violationTypes).toContain('safety_guarantee');
    });
  });

  describe('비교 광고 금지 검증', () => {
    test('최고 병원 표현 감지', () => {
      const content = '서울 최고의 정형외과 병원입니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('최고의 정형외과 병원');
      expect(result.violationTypes).toContain('comparative_advertising');
    });

    test('1위 표현 감지', () => {
      const content = '국내 1위 의료진이 진료합니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('1위 의료진');
      expect(result.violationTypes).toContain('comparative_advertising');
    });

    test('다른 병원 비교 표현 감지', () => {
      const content = '다른 병원보다 훨씬 우수한 결과를 보입니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toContain('다른 병원보다');
      expect(result.violationTypes).toContain('comparative_advertising');
    });
  });

  describe('필수 고지사항 검증', () => {
    test('개인차 고지 확인', () => {
      const content = '무릎 관절염 치료를 제공합니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.missingRequirements).toContain('개인차가 있을 수 있습니다');
    });

    test('전문의 상담 고지 확인', () => {
      const content = '최신 치료법으로 빠른 회복이 가능합니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.missingRequirements).toContain('전문의와 상담하시기 바랍니다');
    });

    test('부작용 가능성 고지 확인', () => {
      const content = '안전한 시술로 만족스러운 결과를 제공합니다.';
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.missingRequirements).toContain('부작용이 있을 수 있습니다');
    });
  });

  describe('준수 콘텐츠 검증', () => {
    test('완전 준수 콘텐츠', () => {
      const content = `무릎 관절염 치료에 대해 안내드립니다. 저희 병원에서는 다양한 치료 옵션을 제공하고 있습니다. 개인차가 있을 수 있으며, 전문의와 상담하시기 바랍니다. 부작용이 있을 수 있습니다.`;
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.missingRequirements).toHaveLength(0);
    });

    test('부분 준수 콘텐츠', () => {
      const content = `
        무릎 관절염 치료 상담을 받아보세요.
        개인차가 있을 수 있습니다.
        전문의와 상담하시기 바랍니다.
      `;
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(0);
      expect(result.missingRequirements).toContain('부작용이 있을 수 있습니다');
    });
  });

  describe('복합 위반 검증', () => {
    test('여러 위반사항이 있는 콘텐츠', () => {
      const content = `
        100% 완치가 보장되는 최고의 병원!
        부작용 없는 안전한 치료!
        다른 병원보다 월등한 실력!
      `;
      const result = checker.check(content);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(2);
      expect(result.violationTypes).toContain('treatment_guarantee');
      expect(result.violationTypes).toContain('comparative_advertising');
      expect(result.violationTypes).toContain('no_side_effects');
      expect(result.missingRequirements).toHaveLength(3);
    });
  });

  describe('점수 계산', () => {
    test('완전 준수 시 만점', () => {
      const content = `건강한 무릎을 위한 치료 상담. 개인차가 있을 수 있으며, 전문의와 상담하시기 바랍니다. 부작용이 있을 수 있습니다.`;
      const result = checker.check(content);
      
      expect(result.complianceScore).toBe(100);
    });

    test('위반사항 있을 시 감점', () => {
      const content = `
        100% 효과적인 치료법입니다.
        개인차가 있을 수 있습니다.
      `;
      const result = checker.check(content);
      
      expect(result.complianceScore).toBeLessThan(100);
      expect(result.complianceScore).toBeGreaterThan(0);
    });

    test('심각한 위반 시 낮은 점수', () => {
      const content = '100% 완치 보장! 부작용 전혀 없음! 최고의 병원!';
      const result = checker.check(content);
      
      expect(result.complianceScore).toBeLessThan(30);
    });
  });

  describe('개선 제안사항', () => {
    test('위반 표현 대체 제안', () => {
      const content = '100% 치료 효과를 보장합니다.';
      const result = checker.check(content);
      
      expect(result.suggestions).toContain('절대적 표현 대신 "효과적인" 등의 표현을 사용하세요');
    });

    test('필수 고지사항 추가 제안', () => {
      const content = '무릎 치료를 받으시면 빠른 회복이 가능합니다.';
      const result = checker.check(content);
      
      expect(result.suggestions).toContain('개인차 및 부작용 가능성에 대한 고지사항을 추가하세요');
    });
  });
});
