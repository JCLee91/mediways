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

    const prompt = `당신은 의료 콘텐츠를 YouTube 쇼츠로 변환하는 전문가입니다.

${medicalLawSystemPrompt}

다음은 의료 관련 블로그 글입니다. 이 글을 24-32초 YouTube 쇼츠 영상(8초 클립 3-4개)에 적합하게 구성해주세요.

제목: ${title}

본문:
${truncatedContent}

요구사항:
1. 전체 요약: 3-5문장으로 핵심 내용만 간결하게 요약
2. 영상 세그먼트: 정확히 3개의 8초 클립 구성 (총 24초)
   - **쇼츠 최적화 필수**:
     * 첫 3초 훅(Hook): 시선 사로잡기, 궁금증 유발
     * 빠른 화면 전환 (3-5초마다 새로운 비주얼)
     * 동적인 움직임 (정적 화면 금지)
     * 강렬한 시각적 요소
   - 스토리: 시작(훅) → 중간(핵심 정보) → 끝(행동 유도)
3. videoPrompt: 각 클립의 영상 생성용 프롬프트 (Veo3 최적화)
   - **쇼츠 최적화 핵심 전략 (FAST PACING & MONTAGE)**:
     * 모든 8초 클립은 **반드시 2~3개의 장면이 빠르게 전환되는 '몽타주(Montage)' 형식**이어야 합니다.
     * **Fast Cuts**: 장면이 2-3초마다 바뀌어야 지루하지 않습니다. "A scene fast cut to B scene" 형식을 사용하세요.
     * **Keywords**: 반드시 \`montage\`, \`fast cut\`, \`rapid transition\`, \`dynamic sequence\` 등의 단어를 포함하세요.
     * **구조**: [장면 1: 2-3초] -> [Fast Cut] -> [장면 2: 2-3초] -> [Fast Cut] -> [장면 3: 2-3초]

   - **Five Pillars Framework 적용**:
     * Subject: 누가 (의사, 환자, 의료진)
     * Action: 무엇을 (상담, 진료, 설명)
     * Environment: 어디서 (병원, 진료실, 대기실)
     * Camera: 촬영 방식 (close-up, medium shot, tracking)
     * Style: 스타일 (cinematic, soft lighting, 4K)
   - **구체적인 디테일 포함**:
     * 인물: 의사 복장, 환자 표정, 감정
     * 동작: 구체적인 움직임, 시선, 제스처
     * 환경: 조명, 분위기, 시간대
     * 카메라: 앵글, 무브먼트, 프레이밍
   - **쇼츠용 동적 프롬프트 예시 (반드시 이 형식을 따를 것)**:
     * 훅(첫 3초): "8-second clip: Montage of anxiety. (0-2s) Extreme close-up of worried patient's eyes. Fast cut to (2-5s) Hands trembling with medical report. Fast cut to (5-8s) Clock ticking on wall. Cinematic 4K, rapid editing, high contrast."
     * 전개: "8-second clip: Medical action sequence. (0-3s) Doctor walking briskly in corridor. Rapid transition to (3-6s) Doctor pointing at X-ray screen. Fast cut to (6-8s) Pen writing prescription. Professional lighting, fast paced, 4K."
     * 결론: "8-second clip: Relief montage. (0-3s) Patient smiling with relief. Fast cut to (3-6s) Doctor and patient shaking hands warmly. Fast cut to (6-8s) Bright clinic exterior. Uplifting atmosphere, commercial quality."

**쇼츠 핵심 원칙**:
- **단일 장면 금지**: 8초 동안 한 장면만 나오면 안 됨. 무조건 컷 전환 포함.
- 정적 화면 금지 → 항상 움직임 포함 (걷기, 제스처, 카메라 무브먼트)
- 감정 표현 명확히 (worried, confident, relieved)
- 조명과 분위기로 감정 강조
- 빠른 컷 대비를 위한 시각적 대비 (어두움→밝음, 긴장→안도)

의료법 준수사항:
- 확정적 효과 표현 금지 (100%, 완치, 절대 등)
- 환자 후기/사례 금지
- 가격 언급 금지
- 과장된 표현 자제

응답 형식 (JSON):
{
  "summary": "전체 요약 텍스트",
  "segments": [
    {
      "title": "훅 - 궁금증 유발",
      "content": "첫 3초 클립 내용 (충격적/흥미로운 문제 제기)",
      "order": 0,
      "videoPrompt": "8-second clip: Montage of anxiety. (0-2s) Extreme close-up of worried patient's eyes. Fast cut to (2-5s) Hands trembling with medical report. Fast cut to (5-8s) Clock ticking on wall. Cinematic 4K, rapid editing, high contrast."
    },
    {
      "title": "전개 - 해결책 제시",
      "content": "두 번째 클립 내용 (전문적인 설명)",
      "order": 1,
      "videoPrompt": "8-second clip: Medical action sequence. (0-3s) Doctor walking briskly in corridor. Rapid transition to (3-6s) Doctor pointing at X-ray screen. Fast cut to (6-8s) Pen writing prescription. Professional lighting, fast paced, 4K."
    },
    {
      "title": "결론 - 희망적 마무리",
      "content": "세 번째 클립 내용 (긍정적 결과)",
      "order": 2,
      "videoPrompt": "8-second clip: Relief montage. (0-3s) Patient smiling with relief. Fast cut to (3-6s) Doctor and patient shaking hands warmly. Fast cut to (6-8s) Bright clinic exterior. Uplifting atmosphere, commercial quality."
    }
  ],
  "totalDuration": 24
}

**중요**: 각 videoPrompt는 반드시 다음을 포함해야 함:
- **"8-second clip:"으로 시작** (kie.ai API에 길이 명시)
- **"Montage", "Fast cut", "Rapid transition" 키워드 필수 포함**
- **2~3개의 서로 다른 장면 묘사**
- 구체적인 감정/표정 (worried, confident, relieved, smiling)
- 카메라 무브먼트 (zoom in, tracking, pull back, push in)
- 조명 분위기 (dramatic, soft, bright, warm)
- 동작 (walking, gesturing, shaking hands, looking)
- 시네마틱 키워드 (4K, depth of field, cinematic)`;

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
