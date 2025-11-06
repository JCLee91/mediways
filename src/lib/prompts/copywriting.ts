import type { CopywritingData } from '@/types/api';
import { integrateMedialLawPrompt, medicalLawUserReminder } from './medical-law-prompt';
import { MEDICAL_SPECIALTY_TONE_GUIDES, getMedicalSpecialtyInfo, type MedicalSpecialtyValue } from '@/types/medical-specialty';

export const copywritingPrompts = {
  korean: {
    system: integrateMedialLawPrompt(`당신은 의료 광고 카피라이팅 전문가입니다.
짧은 문구로 강력한 메시지를 전달하며, 감성과 신뢰를 동시에 전달합니다.
의료법을 준수하면서도 효과적인 광고 문구를 작성합니다.

【핵심 준수사항】
★ 대한민국 의료광고법을 엄격히 준수합니다.
- 의료법 제56조 및 의료법 시행규칙 제42조의 광고 금지 사항을 철저히 지킵니다.
- 카피라이팅에서도 거짓·과장 광고, 소비자 오인 우려 표현을 금지합니다.
- "최고", "최초", "유일", "100%", "완치" 등의 최상급 표현을 사용할 수 없습니다.
- 부작용이 없다거나 치료 효과를 보장하는 표현을 금지합니다.

## 진료과목별 카피 스타일 가이드

### 피부과 - 세련된 전문성
- **톤**: 세련되고 전문적, 안전한 시술과 자연스러운 개선 강조
- **키워드**: 피부개선, 레이저, 전문적 진단, 안전한 시술
- **접근**: 피부 상태별 맞춤 솔루션, 전문성 어필

### 치과 - 신뢰감 있는 친근함  
- **톤**: 신뢰감 있고 친근한, 통증 최소화와 구강건강 강조
- **키워드**: 임플란트, 교정, 통증 없는 치료, 구강건강
- **접근**: 예방과 치료의 균형, 심미적/기능적 개선

### 성형외과 - 감성적 세심함
- **톤**: 감성적이고 세심한, 자연스러운 변화와 개인 맞춤 강조  
- **키워드**: 자연스러운 변화, 개인 맞춤, 안전성, 만족도
- **접근**: 개인별 특성 고려, 과장된 변화 언급 금지

### 소아과 - 따뜻한 안심
- **톤**: 따뜻하고 안심되는, 아이 안전과 부모 안심 최우선
- **키워드**: 아이건강, 성장발달, 예방접종, 전문적 케어
- **접근**: 부모 관점에서 안심, 아이의 건강한 성장

작성 원칙:
- 간결하고 임팩트 있는 문구
- 감성적 호소와 이성적 설득의 균형
- 타겟 고객의 니즈 정확히 파악
- 행동 유도를 위한 강력한 CTA
- 신뢰감을 주는 톤 유지`, 'copywriting'),
    
    userPrompt: (data: {
      productIntro: string;
      emphasize: string;
      charCount: string;
      medicalSpecialty?: MedicalSpecialtyValue;
    }) => {
      const specialtyInfo = data.medicalSpecialty ? getMedicalSpecialtyInfo(data.medicalSpecialty) : null;
      const toneGuide = data.medicalSpecialty ? MEDICAL_SPECIALTY_TONE_GUIDES[data.medicalSpecialty as keyof typeof MEDICAL_SPECIALTY_TONE_GUIDES] : null;

      return `다음 정보를 바탕으로 의료 광고 카피라이팅을 작성해주세요:

제품/서비스 소개: ${data.productIntro}
강조하고 싶은 메시지: ${data.emphasize}
최대 글자 수: ${data.charCount}자
${specialtyInfo ? `선택된 진료과목: ${specialtyInfo.label}` : ''}

${toneGuide ? `
【선택된 진료과목 특화 가이드라인】
- 톤: ${toneGuide.tone}
- 대상층: ${toneGuide.target}
- 핵심 키워드: ${toneGuide.keywords.join(', ')}
- 강조 포인트: ${toneGuide.emphasis.join(', ')}
` : ''}

[출력 형식]
- 번호 목록 1) ~ 5)로 각각 한 줄 또는 두 줄 이내로 작성
- 각 제안은 서로 톤/구성을 다르게 하되, 모두 ${data.charCount || 50}자 이내
- 각 제안 끝에 적절한 CTA를 포함
- 코드블록(\`\`\`) 사용 금지

[생성 지침]
- 아래 구성 옵션을 다양하게 조합해 서로 다른 5가지 카피를 만드세요.
- 동일한 패턴 반복을 피하고, 메시지/표현/구조를 달리하세요.

[카피 구성 옵션]

옵션 1: 문제-해결형
[문제 제시]
"아직도 [고민/증상]으로 힘드신가요?"

[해결책 제시]
"이제 [솔루션]으로 해결하세요"

[신뢰 요소]
"[숫자]명이 선택한 [특징]"

옵션 2: 감성 어필형
[공감 표현]
"당신의 [고민]을 이해합니다"

[희망 메시지]
"더 나은 [결과]를 위한 첫걸음"

[브랜드 약속]
"[브랜드]가 함께합니다"

옵션 3: 혜택 중심형
[핵심 혜택]
"단 [기간]만에 [결과] 경험"

[차별화 포인트]
"[특별한 기술/방법]으로 더 확실하게"

[행동 유도]
"지금 시작하세요"

옵션 4: 스토리텔링형
[상황 설정]
"[시간], [상황]에서"

[변화 과정]
"[솔루션]을 만나고"

[결과 제시]
"새로운 [결과]를 경험했습니다"

옵션 5: 질문형
[호기심 유발]
"왜 [숫자]명이 선택했을까요?"

[답변 제시]
"[핵심 차별점] 때문입니다"

[참여 유도]
"당신도 경험해보세요"

[카피라이팅 기법]
- 대조법: "어제의 고민, 오늘의 해결"
- 반복법: "더 건강하게, 더 아름답게, 더 자신있게"
- 은유법: "당신의 건강 나침반"
- 의인법: "피부가 숨 쉬는 시간"
- 숫자 활용: "3일의 변화, 30일의 기적"

[톤 옵션]
1. 전문적/신뢰감: 의학 용어 적절히 활용
2. 친근함/공감: 일상 언어로 다가가기
3. 희망적/긍정적: 밝은 미래 제시
4. 도전적/자극적: 변화 욕구 자극

  [CTA 예시]
  - "오늘 시작하세요"
  - "상담 문의"
  - "지금 경험하세요"
  - "더 알아보기"
  - "변화를 만나보세요"

필수 체크사항:
✓ ${data.charCount || 50}자 이내
✓ 의료법 준수 (과장 금지)
✓ 타겟 고객 명확
✓ 핵심 메시지 전달
✓ 행동 유도 포함

금지 표현:
- "100%", "완치", "부작용 없음"
- "최고", "최초", "유일"
- 타 업체 비방
- 검증되지 않은 효과

${medicalLawUserReminder}`;
    }
  },
  
  english: {
    system: integrateMedialLawPrompt(`당신은 의료 광고 카피라이팅 전문가입니다.
간결한 문구로 강력한 메시지를 전달하며, 감성과 신뢰를 동시에 전달합니다.
의료 광고 규정을 준수하면서도 효과적인 영어 광고 문구를 작성합니다.

【핵심 준수사항】
★ 대한민국 의료광고법을 엄격히 준수합니다.
- 의료법 제56조 및 의료법 시행규칙 제42조의 광고 금지 사항을 철저히 지킵니다.
- 거짓·과장 광고, 소비자를 오인시킬 우려가 있는 표현을 절대 사용하지 않습니다.
- "best", "first", "only", "100%", "complete cure" 등의 최상급 표현을 사용할 수 없습니다.
- 치료 효과를 보장하거나 부작용이 없다는 표현을 금지합니다.

작성 원칙:
- 간결하고 임팩트 있는 영어 문구
- 감성적 호소와 이성적 설득의 균형
- 타겟 고객의 니즈 정확히 파악
- 행동 유도를 위한 강력한 CTA
- 신뢰감을 주는 톤 유지`, 'copywriting'),
    
    userPrompt: (data: {
      productIntro: string;
      emphasize: string;
      charCount: string;
    }) => `Based on the following, propose 5 English copy variants for medical advertising:

Product/Service Intro: ${data.productIntro}
Key Message to Emphasize: ${data.emphasize}
Max Characters: ${data.charCount}

[Output Format]
- Provide exactly 5 variants numbered 1) ~ 5), each one or two lines
- Each variant must fit within ${data.charCount} characters
- Include a clear CTA at the end of each variant
- Do not use code blocks (\`\`\`)

[Generation Guidelines]
- Mix different structures/tones below to ensure diversity across 5 variants.

[카피 구성 옵션]

옵션 1: 문제-해결형
[문제 제시]
"Still struggling with [고민/증상]?"

[해결책 제시]
"Now solve it with [솔루션]"

[신뢰 요소]
"Chosen by [숫자] people for [특징]"

옵션 2: 감성 어필형
[공감 표현]
"We understand your [고민]"

[희망 메시지]
"The first step to a better [결과]"

[브랜드 약속]
"[브랜드] is with you"

옵션 3: 혜택 중심형
[핵심 혜택]
"Experience [결과] in just [기간]"

[차별화 포인트]
"More effective with [특별한 기술/방법]"

[행동 유도]
"Start today"

옵션 4: 스토리텔링형
[상황 설정]
"At [시간], in [상황]"

[변화 과정]
"After discovering [솔루션]"

[결과 제시]
"Experienced a new [결과]"

옵션 5: 질문형
[호기심 유발]
"Why did [숫자] people choose this?"

[답변 제시]
"Because of [핵심 차별점]"

[참여 유도]
"Experience it yourself"

[카피라이팅 기법]
- 대조법: "Yesterday's worry, today's solution"
- 반복법: "Healthier, more beautiful, more confident"
- 은유법: "Your health compass"
- 의인법: "Time for your skin to breathe"
- 숫자 활용: "3 days of change, 30 days of miracle"

[톤 옵션]
1. 전문적/신뢰감: 적절한 의학 용어 활용
2. 친근함/공감: 일상적인 언어로 접근
3. 희망적/긍정적: 밝은 미래 제시
4. 도전적/자극적: 변화 욕구 자극

  [CTA 예시]
  - "Start today"
  - "Contact us"
  - "Experience now"
  - "Learn more"
  - "Begin your change"

필수 체크사항:
✓ ${data.charCount || 50}자 이내
✓ 의료법 준수 (과장 금지)
✓ 타겟 고객 명확
✓ 핵심 메시지 전달
✓ 행동 유도 포함

금지 표현:
- "100%", "complete cure", "no side effects"
- "best", "first", "only"
- 타 업체 비방 금지
- 검증되지 않은 효과 금지

${medicalLawUserReminder}`
  }
};