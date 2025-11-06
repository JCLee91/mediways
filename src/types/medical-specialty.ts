// 진료과목 타입 정의 (4개 핵심 분야)
export const MEDICAL_SPECIALTIES = [
  { value: '피부과', label: '피부과', category: '피부과' },
  { value: '치과', label: '치과', category: '치과' },
  { value: '성형외과', label: '성형외과', category: '성형외과' },
  { value: '소아과', label: '소아과', category: '소아과' }
] as const;

// 진료과목 타입
export type MedicalSpecialtyValue = typeof MEDICAL_SPECIALTIES[number]['value'];
export type MedicalSpecialtyCategory = typeof MEDICAL_SPECIALTIES[number]['category'];

export interface MedicalSpecialty {
  value: MedicalSpecialtyValue;
  label: string;
  category: MedicalSpecialtyCategory;
}

// 카테고리별 그룹핑을 위한 헬퍼 함수
export function getMedicalSpecialtiesByCategory(): Record<MedicalSpecialtyCategory, MedicalSpecialty[]> {
  return MEDICAL_SPECIALTIES.reduce((acc, specialty) => {
    if (!acc[specialty.category]) {
      acc[specialty.category] = [];
    }
    acc[specialty.category].push(specialty);
    return acc;
  }, {} as Record<MedicalSpecialtyCategory, MedicalSpecialty[]>);
}

// 특정 진료과목의 상세 정보 조회
export function getMedicalSpecialtyInfo(value: MedicalSpecialtyValue): MedicalSpecialty | undefined {
  return MEDICAL_SPECIALTIES.find(specialty => specialty.value === value);
}

// 진료과목별 컨텐츠 톤 가이드
export const MEDICAL_SPECIALTY_TONE_GUIDES: Record<MedicalSpecialtyValue, {
  tone: string;
  target: string;
  keywords: string[];
  emphasis: string[];
}> = {
  '피부과': {
    tone: '세련되고 전문적',
    target: '20-50대',
    keywords: ['피부개선', '레이저', '여드름', '주름', '미백', '피부질환'],
    emphasis: ['안전한 시술', '자연스러운 개선', '전문적 진단']
  },
  '치과': {
    tone: '신뢰감 있고 친근한',
    target: '전 연령',
    keywords: ['임플란트', '교정', '충치', '잇몸', '심미치료', '구강건강'],
    emphasis: ['통증 최소화', '구강건강 유지', '심미적 개선']
  },
  '성형외과': {
    tone: '감성적이고 세심한',
    target: '20-40대',
    keywords: ['자연스러운 변화', '성형수술', '회복', '미용', '자신감'],
    emphasis: ['자연스러운 결과', '안전성', '개인 맞춤']
  },
  '소아과': {
    tone: '따뜻하고 안심되는',
    target: '부모와 아이',
    keywords: ['아이건강', '성장', '예방접종', '발달', '소아질환', '육아'],
    emphasis: ['아이 안전', '부모 안심', '전문적 케어']
  }
};
