import OpenAI from 'openai';
import { medicalLawSystemPrompt } from '@/lib/prompts/medical-law-prompt';

// ═══════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════

/** 1단계: 기획 결과 */
interface ShortsPlan {
  procedureName: string;        // 시술/질환명
  keywords: string[];           // 핵심 키워드 3개
  surprisingFact: string;       // 가장 놀라운 정보
  painPoint: string;            // 가장 공감되는 고민
  keyNumbers: string;           // 핵심 수치/숫자
  hookType: string;             // 선택된 훅 유형 (질문형/충격형/숫자형/손실형/반전형)
  hookSentence: string;         // 훅 문장
  clipOutlines: {               // 3클립 개요
    hook: string;               // 클립1: 훅 개요
    info: string;               // 클립2: 정보 개요
    cta: string;                // 클립3: CTA 개요
  };
}

/** 2단계: 대본 결과 */
interface ShortsScriptDraft {
  shortsTitle: string;
  summary: string;
  segments: {
    title: string;
    content: string;
    order: number;
  }[];
}

/** 3단계: 최종 결과 (videoPrompt 포함) */
interface ShortSegment {
  title: string;
  content: string;
  order: number;
  videoPrompt: string;
}

interface ShortsScript {
  shortsTitle: string;
  summary: string;
  segments: ShortSegment[];
  totalDuration: number;
}

// ═══════════════════════════════════════════════════════════════
// 서비스 클래스
// ═══════════════════════════════════════════════════════════════

export class ShortsScriptGeneratorService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  // ═══════════════════════════════════════════════════════════════
  // 메인 함수: 3단계 순차 실행
  // ═══════════════════════════════════════════════════════════════
  async generateScript(
    title: string,
    content: string,
    onProgress?: (stage: number) => Promise<void>
  ): Promise<ShortsScript> {
    const truncatedContent = content.slice(0, 8000);

    console.log('[ShortsScript] 1단계: 기획 생성 시작...');
    const plan = await this.generatePlan(title, truncatedContent);
    console.log('[ShortsScript] 1단계 완료:', plan.hookType, plan.hookSentence);

    // 2단계 시작 알림
    if (onProgress) await onProgress(1);

    console.log('[ShortsScript] 2단계: 대본 생성 시작...');
    const scriptDraft = await this.generateScriptDraft(title, truncatedContent, plan);
    console.log('[ShortsScript] 2단계 완료:', scriptDraft.shortsTitle);

    // 3단계 시작 알림
    if (onProgress) await onProgress(2);

    console.log('[ShortsScript] 3단계: 영상 프롬프트 생성 시작...');
    const finalScript = await this.generateVideoPrompts(plan, scriptDraft);
    console.log('[ShortsScript] 3단계 완료. 전체 완료!');

    return finalScript;
  }

  // ═══════════════════════════════════════════════════════════════
  // 1단계: 기획 (블로그 분석 → 훅/구조 기획)
  // ═══════════════════════════════════════════════════════════════
  private async generatePlan(title: string, content: string): Promise<ShortsPlan> {
    const prompt = `당신은 100만 뷰 바이럴 쇼츠 전문 기획자입니다.

${medicalLawSystemPrompt}

═══════════════════════════════════════════════════════════════
【블로그 분석 대상】
═══════════════════════════════════════════════════════════════

제목: ${title}

본문:
${content}

═══════════════════════════════════════════════════════════════
【분석 및 기획 지시】
═══════════════════════════════════════════════════════════════

위 블로그를 분석하여 바이럴 쇼츠 기획안을 작성하세요.

1. 블로그에서 추출:
   - 시술/질환명 (예: 라식, 백내장, 보톡스)
   - 핵심 키워드 3개 (반복되는 단어)
   - 가장 놀라운 정보 (시청자가 "어?" 할 내용)
   - 가장 공감되는 고민 (타겟의 Pain Point)
   - 핵심 수치/숫자 (시간, 비용, 효과 등)

2. 훅(Hook) 선택 - ★가장 중요★
   첫 1.7초 안에 스와이프 결정! 아래 5가지 중 가장 효과적인 것 선택:

   - 질문형: "[시술명] 아직도 모르세요?"
   - 충격형: "의사도 말 안 해주는 [질환] 진실"
   - 숫자형: "[숫자]분 만에 끝나는 [시술명]"
   - 손실형: "[질환] 방치하면 이렇게 됩니다"
   - 반전형: "[시술명] 무섭다고요? 사실은..."

   ❌ 일반적 훅 금지 ("건강 고민 있으세요?" 등)
   ✅ 반드시 블로그의 구체적 내용/수치 활용!

3. 3클립 구조 개요 (각 8초, 총 24초):
   - 클립1 (훅): 0-3초 훅 + 3-8초 공감/문제 확장
   - 클립2 (정보): 블로그 핵심 정보 2개
   - 클립3 (CTA): 긍정적 결과 + 행동 유도

═══════════════════════════════════════════════════════════════
【출력 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "procedureName": "시술/질환명",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "surprisingFact": "가장 놀라운 정보 (1문장)",
  "painPoint": "가장 공감되는 고민 (1문장)",
  "keyNumbers": "핵심 수치 (예: 10분, 90% 등)",
  "hookType": "질문형|충격형|숫자형|손실형|반전형 중 하나",
  "hookSentence": "실제 사용할 훅 문장 (블로그 내용 기반)",
  "clipOutlines": {
    "hook": "클립1 개요: 훅 + 공감 포인트",
    "info": "클립2 개요: 전달할 핵심 정보 2개",
    "cta": "클립3 개요: 기대효과 + 행동유도"
  }
}`;

    const response = await this.callAI(prompt);
    return JSON.parse(response) as ShortsPlan;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2단계: 대본 생성 (기획 → 대본)
  // ═══════════════════════════════════════════════════════════════
  private async generateScriptDraft(
    title: string,
    content: string,
    plan: ShortsPlan
  ): Promise<ShortsScriptDraft> {
    const prompt = `당신은 바이럴 쇼츠 대본 작가입니다. 기획안을 바탕으로 대본을 작성합니다.

${medicalLawSystemPrompt}

═══════════════════════════════════════════════════════════════
【기획안】
═══════════════════════════════════════════════════════════════

시술/질환명: ${plan.procedureName}
핵심 키워드: ${plan.keywords.join(', ')}
놀라운 정보: ${plan.surprisingFact}
Pain Point: ${plan.painPoint}
핵심 수치: ${plan.keyNumbers}

선택된 훅: ${plan.hookType}
훅 문장: "${plan.hookSentence}"

클립 구조:
- 클립1 (훅): ${plan.clipOutlines.hook}
- 클립2 (정보): ${plan.clipOutlines.info}
- 클립3 (CTA): ${plan.clipOutlines.cta}

═══════════════════════════════════════════════════════════════
【원본 블로그 (참고용)】
═══════════════════════════════════════════════════════════════

제목: ${title}
내용 요약: ${content.slice(0, 2000)}...

═══════════════════════════════════════════════════════════════
【대본 작성 규칙】
═══════════════════════════════════════════════════════════════

★ 필수 규칙:
- 기획안의 훅 문장을 첫 문장으로 사용
- 시술명/질환명 "${plan.procedureName}" 반드시 포함
- 핵심 수치 "${plan.keyNumbers}" 반드시 활용
- 말투: 빠르고 단정적 (~해요, ~에요)
- 문장당 10자 이내 (빠른 자막용)

★ 시간 배분 (총 24초):
- 클립1 (0-8초): 훅 3초 + 공감 확장 5초
- 클립2 (8-16초): 정보1 4초 + 정보2 4초
- 클립3 (16-24초): 기대효과 4초 + CTA 4초

❌ 금지:
- 의료법 위반 (완치, 100%, 환자후기, 가격)
- 블로그에 없는 내용 창작
- 느린 전개, 긴 설명

═══════════════════════════════════════════════════════════════
【출력 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "shortsTitle": "쇼츠 제목 (15자 이내, 시술명 포함, 호기심 유발)",
  "summary": "블로그 핵심 요약 (시술명 + 핵심 정보 2-3개)",
  "segments": [
    {
      "title": "훅: ${plan.hookType}",
      "content": "[0-3초 훅] [3-8초 공감 확장] - 각 문장 짧게!",
      "order": 0
    },
    {
      "title": "정보: 핵심 전달",
      "content": "[8-12초 정보1] [12-16초 정보2] - 블로그 내용 기반!",
      "order": 1
    },
    {
      "title": "CTA: 행동 유도",
      "content": "[16-20초 기대효과] [20-24초 CTA] - 긍정적 마무리!",
      "order": 2
    }
  ]
}`;

    const response = await this.callAI(prompt);
    return JSON.parse(response) as ShortsScriptDraft;
  }

  // ═══════════════════════════════════════════════════════════════
  // 3단계: 영상 프롬프트 생성 (대본 → Grok Imagine 프롬프트)
  // ═══════════════════════════════════════════════════════════════
  private async generateVideoPrompts(
    plan: ShortsPlan,
    scriptDraft: ShortsScriptDraft
  ): Promise<ShortsScript> {
    const segmentsInfo = scriptDraft.segments
      .map((s, i) => `클립${i + 1} (${s.title}): "${s.content}"`)
      .join('\n');

    const prompt = `당신은 AI 영상 생성 전문가입니다. 대본에 맞는 Grok Imagine 프롬프트를 작성합니다.

═══════════════════════════════════════════════════════════════
【대본 정보】
═══════════════════════════════════════════════════════════════

시술/질환: ${plan.procedureName}
핵심 키워드: ${plan.keywords.join(', ')}

${segmentsInfo}

═══════════════════════════════════════════════════════════════
【Grok Imagine 프롬프트 작성 규칙】
═══════════════════════════════════════════════════════════════

★ 황금 공식: Action + Subject + Framing + Environment + Lighting + Style
★ 8초 클립 = 3컷 (빠른 전환 필수)
★ 600-700자 영문 권장

【필수 포함 요소】
1. Quick cuts, fast-paced (빠른 전환)
2. 구체적 장면 3개 (각 3단어)
3. Korean 환경 (clinic, hospital, setting)
4. 감정/분위기 (dramatic, hopeful, professional 등)
5. cinematic 4K
6. "no text, no titles, no captions" (글자 생성 금지!)

【주제별 시각 요소】
- 안과: 시력표, 눈 검사, 안과 장비, 안경 벗는 장면
- 피부과: 피부 클로즈업, 레이저 시술, 거울 보는 장면
- 성형외과: 상담 장면, 고민 표정, 자신감 있는 모습
- 통증의학과: 통증 표정, 치료 장면, 활동하는 모습
- 치과: 치아 클로즈업, 치과 체어, 미소 짓는 장면

【프롬프트 형식 예시】
"Quick cuts, fast-paced montage: [장면1 3단어], [장면2 3단어], [장면3 3단어]. Korean [의료시설], [감정] atmosphere, cinematic lighting, 4K quality, no text, no titles, no captions"

❌ 절대 금지:
- 텍스트/글자/자막 생성 요청 (AI가 글자를 깨뜨림)
- 한글 프롬프트
- 추상적 표현

═══════════════════════════════════════════════════════════════
【출력 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "videoPrompts": [
    {
      "order": 0,
      "prompt": "클립1용 영문 프롬프트 (훅 장면, 600자+)"
    },
    {
      "order": 1,
      "prompt": "클립2용 영문 프롬프트 (정보 장면, 600자+)"
    },
    {
      "order": 2,
      "prompt": "클립3용 영문 프롬프트 (CTA 장면, 600자+)"
    }
  ]
}`;

    const response = await this.callAI(prompt);
    const promptsResult = JSON.parse(response) as {
      videoPrompts: { order: number; prompt: string }[];
    };

    // 대본과 프롬프트 결합
    const segments: ShortSegment[] = scriptDraft.segments.map((seg) => {
      const videoPromptData = promptsResult.videoPrompts.find(
        (p) => p.order === seg.order
      );
      return {
        ...seg,
        videoPrompt: videoPromptData?.prompt || '',
      };
    });

    return {
      shortsTitle: scriptDraft.shortsTitle,
      summary: scriptDraft.summary,
      segments,
      totalDuration: 24,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // AI 호출 헬퍼
  // ═══════════════════════════════════════════════════════════════
  private async callAI(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert viral shorts content creator. Always respond in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      return content;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
      throw error;
    }
  }
}
