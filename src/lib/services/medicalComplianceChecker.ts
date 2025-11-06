// 의료법 준수 검사 결과 타입
export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  violationTypes: ViolationType[];
  missingRequirements: string[];
  complianceScore: number;
  suggestions: string[];
}

export type ViolationType = 
  | 'treatment_guarantee'    // 치료 효과 보장
  | 'absolute_claim'         // 절대적 표현
  | 'no_side_effects'        // 부작용 없음 주장
  | 'safety_guarantee'       // 안전성 보장
  | 'comparative_advertising' // 비교 광고
  | 'superlative_expression'; // 최상급 표현

export class MedicalComplianceChecker {
  // 금지된 패턴들 - 실제 의료법 위반 표현들
  private readonly prohibitedPatterns = [
    // 치료 효과 보장 금지
    { 
      pattern: /100%\s*(치료|완치|효과|성공|회복)/gi, 
      type: 'treatment_guarantee' as ViolationType,
      description: '100% 치료 효과 보장'
    },
    { 
      pattern: /(완치|완전치료)\s*(보장|확실|가능)/gi, 
      type: 'treatment_guarantee' as ViolationType,
      description: '완치 보장'
    },
    { 
      pattern: /치료\s*(보장|확실|100%)/gi, 
      type: 'treatment_guarantee' as ViolationType,
      description: '치료 보장'
    },

    // 절대적 표현 금지
    { 
      pattern: /절대\s*(안전|효과|회복|치료)/gi, 
      type: 'absolute_claim' as ViolationType,
      description: '절대적 효과 주장'
    },
    { 
      pattern: /(무조건|반드시|확실히)\s*(치료|회복|효과)/gi, 
      type: 'absolute_claim' as ViolationType,
      description: '절대적 치료 주장'
    },

    // 부작용 없음 주장 금지
    { 
      pattern: /부작용\s*(없음|전혀|제로|zero)/gi, 
      type: 'no_side_effects' as ViolationType,
      description: '부작용 없음 주장'
    },
    { 
      pattern: /부작용이\s*전혀\s*없습니다/gi, 
      type: 'no_side_effects' as ViolationType,
      description: '부작용이 전혀 없습니다'
    },
    { 
      pattern: /부작용\s*없는/gi, 
      type: 'no_side_effects' as ViolationType,
      description: '부작용 없는'
    },

    // 안전성 보장 금지
    { 
      pattern: /(안전|무해)\s*100%/gi, 
      type: 'safety_guarantee' as ViolationType,
      description: '100% 안전성 보장'
    },
    { 
      pattern: /100%\s*안전/gi, 
      type: 'safety_guarantee' as ViolationType,
      description: '100% 안전'
    },

    // 비교 광고 금지
    { 
      pattern: /(최고|최상|최대)\s*(의|한)?\s*(병원|의원|의사|의료진|클리닉)/gi, 
      type: 'comparative_advertising' as ViolationType,
      description: '최고 의료기관 표현'
    },
    { 
      pattern: /(국내|서울|지역)\s*1위\s*(병원|의원|의사|의료진)/gi, 
      type: 'comparative_advertising' as ViolationType,
      description: '1위 표현'
    },
    { 
      pattern: /1위\s*(의료진|병원|의원)/gi, 
      type: 'comparative_advertising' as ViolationType,
      description: '1위 의료진'
    },
    { 
      pattern: /다른\s*(병원|의원)보다/gi, 
      type: 'comparative_advertising' as ViolationType,
      description: '다른 병원과의 비교'
    },
    { 
      pattern: /(최고|최상|최대)의\s*(정형외과|내과|외과|피부과|성형외과)\s*(병원|의원)/gi, 
      type: 'comparative_advertising' as ViolationType,
      description: '최고의 진료과 표현'
    }
  ];

  // 필수 고지사항들 (유연한 매칭을 위한 패턴)
  private readonly requiredStatements = [
    { text: '개인차가 있을 수 있습니다', pattern: /개인차가?\s*있을\s*수\s*있(습니다|으며|음)/ },
    { text: '전문의와 상담하시기 바랍니다', pattern: /전문의와?\s*상담하시기?\s*(바랍니다|바람)/ }, 
    { text: '부작용이 있을 수 있습니다', pattern: /부작용이?\s*있을\s*수\s*있(습니다|음|으며)/ }
  ];

  /**
   * 의료법 준수 검사 수행
   */
  check(content: string): ComplianceResult {
    if (!content || content.trim().length === 0) {
      return {
        isCompliant: false,
        violations: [],
        violationTypes: [],
        missingRequirements: this.requiredStatements.map(req => req.text),
        complianceScore: 0,
        suggestions: ['콘텐츠가 없습니다. 적절한 내용을 작성해주세요.']
      };
    }

    const violations: string[] = [];
    const violationTypes: ViolationType[] = [];
    const suggestions: string[] = [];

    // 금지 표현 검사
    for (const prohibitedItem of this.prohibitedPatterns) {
      const matches = content.match(prohibitedItem.pattern);
      if (matches) {
        violations.push(...matches);
        if (!violationTypes.includes(prohibitedItem.type)) {
          violationTypes.push(prohibitedItem.type);
        }
      }
    }

    // 필수 고지사항 검사
    const missingRequirements: string[] = [];
    for (const requirement of this.requiredStatements) {
      if (!requirement.pattern.test(content)) {
        missingRequirements.push(requirement.text);
      }
    }

    // 점수 계산
    const complianceScore = this.calculateComplianceScore(violations, missingRequirements);

    // 개선 제안사항 생성
    if (violations.length > 0) {
      suggestions.push('절대적 표현 대신 "효과적인" 등의 표현을 사용하세요');
    }
    if (missingRequirements.length > 0) {
      suggestions.push('개인차 및 부작용 가능성에 대한 고지사항을 추가하세요');
    }

    // 위반 유형별 맞춤 제안
    if (violationTypes.includes('treatment_guarantee')) {
      suggestions.push('치료 효과를 보장하는 표현은 금지됩니다');
    }
    if (violationTypes.includes('comparative_advertising')) {
      suggestions.push('다른 의료기관과의 비교나 최상급 표현은 피해주세요');
    }
    if (violationTypes.includes('no_side_effects')) {
      suggestions.push('부작용 가능성에 대한 적절한 안내가 필요합니다');
    }

    const isCompliant = violations.length === 0 && missingRequirements.length === 0;

    return {
      isCompliant,
      violations,
      violationTypes,
      missingRequirements,
      complianceScore,
      suggestions
    };
  }

  /**
   * 준수도 점수 계산 (0-100점)
   */
  private calculateComplianceScore(violations: string[], missingRequirements: string[]): number {
    let score = 100;

    // 위반사항 1개당 -15점
    score -= violations.length * 15;

    // 필수 고지사항 누락 1개당 -10점
    score -= missingRequirements.length * 10;

    // 최소 0점 보장
    return Math.max(0, score);
  }

  /**
   * 콘텐츠 유형별 맞춤 검사
   */
  checkByContentType(content: string, contentType: 'blog' | 'sns' | 'advertisement'): ComplianceResult {
    const baseResult = this.check(content);

    // 콘텐츠 유형별 추가 검사 및 제안사항
    switch (contentType) {
      case 'blog':
        if (!content.includes('전문의')) {
          baseResult.suggestions.push('블로그 글에는 전문의 언급을 권장합니다');
        }
        break;
        
      case 'sns':
        if (content.length > 100 && !content.includes('개인차')) {
          baseResult.suggestions.push('SNS 콘텐츠에도 개인차 언급이 필요합니다');
        }
        break;
        
      case 'advertisement':
        // 광고에서는 더 엄격한 기준 적용
        if (baseResult.complianceScore < 90) {
          baseResult.suggestions.push('광고 콘텐츠는 더 높은 준수 기준이 필요합니다');
        }
        break;
    }

    return baseResult;
  }

  /**
   * 위반 표현 대체 제안
   */
  getSafeAlternatives(violationType: ViolationType): string[] {
    const alternatives: Record<ViolationType, string[]> = {
      'treatment_guarantee': [
        '효과적인 치료',
        '개선된 결과',
        '만족스러운 치료 경험'
      ],
      'absolute_claim': [
        '안전한 시술',
        '검증된 치료법',
        '신뢰할 수 있는 방법'
      ],
      'no_side_effects': [
        '부작용을 최소화한',
        '안전성이 검증된',
        '주의깊게 진행되는'
      ],
      'safety_guarantee': [
        '안전성이 높은',
        '검증된 안전성의',
        '신중하게 진행되는'
      ],
      'comparative_advertising': [
        '전문적인 의료진',
        '경험 많은 의료진',
        '숙련된 전문의'
      ],
      'superlative_expression': [
        '우수한',
        '전문적인',
        '경험 많은'
      ]
    };

    return alternatives[violationType] || ['적절한 표현으로 수정'];
  }
}
