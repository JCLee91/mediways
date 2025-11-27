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

    const prompt = `당신은 의료 블로그 글을 YouTube 쇼츠 대본으로 변환하는 전문가입니다.

${medicalLawSystemPrompt}

═══════════════════════════════════════════════════════════════
【필수: 블로그 글 분석】
═══════════════════════════════════════════════════════════════

아래 블로그 글을 먼저 분석하세요:

제목: ${title}

본문:
${truncatedContent}

【분석 항목】
1. 핵심 주제: 이 블로그가 다루는 시술/질환/의료서비스는?
2. 핵심 키워드: 블로그에서 반복되는 중요 단어 3-5개
3. 핵심 정보: 독자가 알아야 할 가장 중요한 내용 3가지
4. 타겟 고민: 이 글을 읽는 사람의 주요 고민/니즈

═══════════════════════════════════════════════════════════════
【대본 작성 규칙 - 반드시 준수】
═══════════════════════════════════════════════════════════════

★★★ 가장 중요: 블로그 내용 반영 ★★★
- 대본(content)에 블로그의 핵심 키워드를 반드시 포함
- 블로그에서 언급된 시술명/질환명/의료용어를 그대로 사용
- 블로그의 핵심 정보를 요약하여 대본에 반영
- 일반적인 의료 내용이 아닌, 이 블로그만의 고유한 정보 전달

★ 2-3초 빠른 전환 (바이럴 쇼츠 스타일)
- 8초 클립 내에서 2-3초마다 장면 전환
- 각 클립당 3-4개의 빠른 컷
- 시청자가 지루할 틈 없이 빠른 템포 유지

★ 구조: 3개 클립 × 8초 = 24초
- 클립1 (훅): 블로그 주제에 맞는 공감 포인트로 시작
- 클립2 (전개): 블로그의 핵심 정보/해결책 전달
- 클립3 (결론): 블로그 내용 기반 긍정적 마무리

═══════════════════════════════════════════════════════════════
【대본(content) 작성 가이드】
═══════════════════════════════════════════════════════════════

content는 쇼츠 영상의 자막/나레이션입니다.

✅ 올바른 예시 (블로그가 "라식 수술"에 관한 경우):
- 클립1: "안경 없이 살고 싶은데... 라식, 진짜 안전할까?"
- 클립2: "라식은 각막을 레이저로 깎아 시력을 교정하는 수술이에요. 수술 시간은 단 10분!"
- 클립3: "라식 후 다음 날부터 일상생활 가능! 자세한 상담 받아보세요"

❌ 잘못된 예시 (블로그 내용 무시):
- "요즘 건강 고민 많으시죠?"
- "전문가와 상담하면 해결돼요"
- "지금 바로 상담받으세요"

→ 블로그 주제와 무관한 일반적인 내용은 금지!

═══════════════════════════════════════════════════════════════
【videoPrompt 작성 가이드】
═══════════════════════════════════════════════════════════════

videoPrompt는 AI 영상 생성용 프롬프트입니다.

★ 블로그 주제 반영 필수
- 블로그 주제에 맞는 시각적 요소 포함
- 예: 라식 블로그 → 안과, 눈 검사, 시력표 등
- 예: 피부과 블로그 → 피부 클리닉, 레이저 시술 등

★ 형식 규칙
- 50-150 단어
- 첫 문장에 "quick cuts" 또는 "fast-paced" 필수
- "quick cuts between: 장면1, 장면2, 장면3" 형태
- 반드시 Korean 키워드 포함 (Korean doctor, Korean clinic 등)
- 4K, cinematic 품질 명시

★ 장면 구성 (8초 = 3-4컷)
- 2-3초마다 다른 장면으로 전환
- 각 장면 설명은 3-5단어로 간결하게

═══════════════════════════════════════════════════════════════
【의료법 준수】
═══════════════════════════════════════════════════════════════
- 확정적 효과 표현 금지 (100%, 완치, 절대 등)
- 환자 후기/사례 금지
- 가격 언급 금지
- 과장된 표현 자제

═══════════════════════════════════════════════════════════════
【응답 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "summary": "블로그 핵심 내용 3-5문장 요약 (블로그의 주제, 핵심 정보 포함)",
  "segments": [
    {
      "title": "훅 - [블로그 주제]에 대한 공감",
      "content": "[블로그 키워드]를 포함한 훅 자막 (시청자 고민 공감)",
      "order": 0,
      "videoPrompt": "Quick cuts montage: [블로그 주제 관련 장면1], [장면2], [장면3]. Korean setting, soft lighting, close-ups, cinematic 4K"
    },
    {
      "title": "전개 - [블로그 핵심 정보]",
      "content": "[블로그의 핵심 정보/시술 설명] 자막",
      "order": 1,
      "videoPrompt": "Fast-paced sequence in Korean [관련 의료시설]: quick cuts between [블로그 주제 관련 의료 장면들]. Professional lighting, 4K"
    },
    {
      "title": "결론 - [블로그 기반 마무리]",
      "content": "[블로그 내용 기반 긍정적 결론 + CTA]",
      "order": 2,
      "videoPrompt": "Dynamic montage of positive outcome: quick cuts between [블로그 주제 관련 긍정적 장면들]. Warm hopeful mood, Korean setting, 4K"
    }
  ],
  "totalDuration": 24
}

═══════════════════════════════════════════════════════════════
【최종 체크리스트】
═══════════════════════════════════════════════════════════════
✅ summary에 블로그 주제/핵심 정보 포함
✅ content에 블로그 키워드/시술명/질환명 포함
✅ videoPrompt에 블로그 주제 관련 시각적 요소 포함
✅ 각 클립 8초, 총 24초
✅ 2-3초마다 빠른 전환 (quick cuts)
✅ 한국 배경/한국인 (Korean 키워드)
✅ 의료법 준수
❌ 일반적/뻔한 내용 금지 - 반드시 이 블로그만의 내용 반영`;

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
