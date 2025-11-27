import OpenAI from 'openai';
import { medicalLawSystemPrompt } from '@/lib/prompts/medical-law-prompt';

interface ShortSegment {
  title: string;
  content: string;
  order: number;
  videoPrompt: string;
}

interface ShortsScript {
  summary: string;
  segments: ShortSegment[];
  totalDuration: number;
}

export class ShortsScriptGeneratorService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateScript(title: string, content: string): Promise<ShortsScript> {
    const truncatedContent = content.slice(0, 8000);

    const prompt = `당신은 바이럴 쇼츠 전문 PD입니다. 의료 블로그를 100만 뷰 쇼츠로 변환합니다.

${medicalLawSystemPrompt}

═══════════════════════════════════════════════════════════════
【STEP 1: 블로그 분석】
═══════════════════════════════════════════════════════════════

제목: ${title}

본문:
${truncatedContent}

위 블로그에서 추출하세요:
1. 시술/질환명: (예: 라식, 백내장, 보톡스 등)
2. 핵심 키워드 3개: (블로그에서 반복되는 단어)
3. 가장 놀라운 정보: (시청자가 "어?" 할 만한 내용)
4. 가장 공감되는 고민: (타겟 시청자의 Pain Point)
5. 핵심 수치/숫자: (시간, 비용, 효과 등 구체적 숫자)

═══════════════════════════════════════════════════════════════
【STEP 2: 훅(Hook) 기획 - 가장 중요!】
═══════════════════════════════════════════════════════════════

★★★ 첫 3초가 승부! 1.7초 안에 스와이프 결정 ★★★

블로그 내용을 바탕으로 아래 5가지 훅 유형 중 가장 효과적인 것을 선택:

【훅 유형 5가지】
1. 질문형: "[시술명] 아직도 모르세요?" / "[질환] 이렇게 하면 악화돼요?"
2. 충격형: "[시술명]의 이 사실, 알고 계셨나요?" / "의사도 말 안 해주는 [질환] 진실"
3. 숫자형: "[숫자]분 만에 끝나는 [시술명]" / "[숫자]명 중 [숫자]명이 모르는 사실"
4. 손실형: "[질환] 방치하면 이렇게 됩니다" / "이거 안 하면 [시술명] 효과 반토막"
5. 반전형: "[시술명] 무섭다고요? 사실은..." / "[질환] 최악이라 생각했는데..."

→ 블로그에서 추출한 "가장 놀라운 정보" 또는 "핵심 수치"를 훅에 활용!
→ 일반적인 훅 금지! 반드시 이 블로그의 구체적 내용으로!

═══════════════════════════════════════════════════════════════
【STEP 3: 대본 구조 (24초 = 3클립)】
═══════════════════════════════════════════════════════════════

【클립1: 훅 (0-8초)】
- 0-3초: 강력한 훅 (STEP 2에서 선택한 유형)
- 3-8초: 공감/문제 확장

【클립2: 정보 (8-16초)】
- 8-12초: 블로그 핵심 정보 1
- 12-16초: 블로그 핵심 정보 2

【클립3: CTA (16-24초)】
- 16-20초: 긍정적 결과/기대효과
- 20-24초: 행동 유도 (상담, 검색 등)

★ 대본 작성 규칙:
- 블로그의 시술명/질환명을 반드시 포함
- 블로그의 구체적 숫자/수치 활용
- 말투: 빠르고 단정적 (~해요, ~에요)
- 문장당 10자 이내 권장 (빠른 자막용)

═══════════════════════════════════════════════════════════════
【STEP 4: 영상 프롬프트 (videoPrompt)】
═══════════════════════════════════════════════════════════════

★ 3초마다 장면 전환 필수 (8초 클립 = 3컷)
★ 블로그 주제에 맞는 시각적 요소

【형식】
"Quick cuts, fast-paced: [장면1 3단어], [장면2 3단어], [장면3 3단어]. Korean [의료시설], [감정/분위기], cinematic 4K"

【주제별 시각 요소 예시】
- 안과(라식/백내장): 시력표, 눈 검사, 안과 장비, 안경 벗는 장면
- 피부과: 피부 클로즈업, 레이저 시술, 거울 보는 장면
- 성형외과: 상담 장면, Before 고민, After 자신감
- 통증의학과: 통증 표정, 치료 장면, 활동하는 모습
- 치과: 치아 클로즈업, 치과 체어, 미소 짓는 장면

═══════════════════════════════════════════════════════════════
【금지사항】
═══════════════════════════════════════════════════════════════
❌ 의료법: 완치/100%/확실한 효과/환자후기/가격
❌ 일반적 훅: "건강 고민 있으세요?" "전문가와 상담하세요"
❌ 블로그 무관 내용: 블로그에 없는 정보 창작 금지
❌ 느린 전개: 인트로/브랜딩/긴 설명 금지

═══════════════════════════════════════════════════════════════
【출력 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "summary": "블로그 핵심 요약 (시술명/질환명 + 핵심 정보 2-3개)",
  "segments": [
    {
      "title": "훅: [선택한 훅 유형] - [블로그 주제]",
      "content": "[0-3초 훅 문장] [3-8초 공감 확장]",
      "order": 0,
      "videoPrompt": "Quick cuts, fast-paced: [주제 관련 장면1], [장면2], [장면3]. Korean clinic, dramatic mood, 4K"
    },
    {
      "title": "정보: [블로그 핵심 정보]",
      "content": "[8-12초 정보1] [12-16초 정보2]",
      "order": 1,
      "videoPrompt": "Quick cuts, fast-paced: [의료 장면1], [장면2], [장면3]. Korean hospital, professional, 4K"
    },
    {
      "title": "CTA: [기대효과 + 행동유도]",
      "content": "[16-20초 긍정적 결과] [20-24초 CTA]",
      "order": 2,
      "videoPrompt": "Quick cuts, fast-paced: [긍정적 장면1], [장면2], [장면3]. Korean setting, hopeful mood, 4K"
    }
  ],
  "totalDuration": 24
}

═══════════════════════════════════════════════════════════════
【최종 체크】
═══════════════════════════════════════════════════════════════
✅ 훅이 블로그의 구체적 내용인가? (일반적 X)
✅ 시술명/질환명이 대본에 포함되었나?
✅ 블로그의 숫자/수치가 활용되었나?
✅ 3초마다 장면 전환 (quick cuts)?
✅ 의료법 준수?`;

    try {
      // Responses API 사용 (GPT-5 시리즈 권장)
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano', // 요약/구조화 최적화, gpt-4o-mini보다 40% 저렴
        input: prompt,
        reasoning: {
          effort: 'minimal'  // reasoning 토큰 최소화 (빠른 응답)
        },
        text: {
          verbosity: 'low',  // 간결한 응답
          format: { type: 'json_object' }  // JSON 출력
        }
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      return JSON.parse(responseContent) as ShortsScript;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
      throw error;
    }
  }
}
