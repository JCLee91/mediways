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

    const systemPrompt = `당신은 의료 콘텐츠를 YouTube 쇼츠로 변환하는 전문가입니다.

${medicalLawSystemPrompt}

응답은 반드시 유효한 JSON 형식이어야 합니다.`;

    const userPrompt = `다음은 의료 관련 블로그 글입니다. 이 글을 24-32초 YouTube 쇼츠 영상(8초 클립 3-4개)에 적합하게 구성해주세요.

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
   - **쇼츠용 동적 프롬프트 예시**:
     * 훅(첫 3초): "8-second clip: Close-up of patient's worried expression in modern clinic waiting room, nervously checking phone. Camera slowly pushes in, dramatic lighting, high contrast. Shot on 35mm film, cinematic style, 4K."
     * 전개: "8-second clip: Professional doctor in white coat energetically walks through bright hospital corridor, greeting staff with confident smile. Camera tracking shot following movement, warm lighting, depth of field. Medical equipment visible in background."
     * 결론: "8-second clip: Doctor and patient shake hands warmly in consultation room, both smiling with relief. Sunlight streaming through large windows, hopeful atmosphere. Medium shot with soft focus, uplifting mood, commercial quality."

**쇼츠 핵심 원칙**:
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
      "videoPrompt": "8-second clip: Extreme close-up of worried patient's eyes in dimly lit waiting room, hands trembling while holding medical report. Camera slowly zooms in, creating tension. High contrast dramatic lighting, cinematic 4K, shallow depth of field. Shot on 35mm film."
    },
    {
      "title": "전개 - 해결책 제시",
      "content": "두 번째 클립 내용 (전문적인 설명)",
      "order": 1,
      "videoPrompt": "8-second clip: Dynamic tracking shot of confident doctor in white coat walking briskly through modern hospital corridor, explaining treatment while gesturing expressively. Bright professional lighting, medical equipment visible. Medium shot with smooth camera movement, warm tones, 4K quality."
    },
    {
      "title": "결론 - 희망적 마무리",
      "content": "세 번째 클립 내용 (긍정적 결과)",
      "order": 2,
      "videoPrompt": "8-second clip: Doctor and patient smiling warmly while shaking hands in bright consultation room, sunlight streaming through large windows creating hopeful atmosphere. Camera gently pulls back revealing modern clinic interior. Soft focus, uplifting mood, commercial quality, 4K."
    }
  ],
  "totalDuration": 24
}

**중요**: 각 videoPrompt는 반드시 다음을 포함해야 함:
- **"8-second clip:"으로 시작** (kie.ai API에 길이 명시)
- 구체적인 감정/표정 (worried, confident, relieved, smiling)
- 카메라 무브먼트 (zoom in, tracking, pull back, push in)
- 조명 분위기 (dramatic, soft, bright, warm)
- 동작 (walking, gesturing, shaking hands, looking)
- 시네마틱 키워드 (4K, depth of field, cinematic)`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-mini', // 최신 모델
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      const result = JSON.parse(responseContent);

      // 검증
      if (!result.summary || !result.segments || !Array.isArray(result.segments)) {
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      if (result.segments.length !== 3) {
        throw new Error('세그먼트는 정확히 3개여야 합니다.');
      }

      // 각 세그먼트 검증
      for (const segment of result.segments) {
        if (!segment.title || !segment.content || !segment.videoPrompt) {
          throw new Error('세그먼트 정보가 불완전합니다.');
        }
      }

      return result as ShortsScript;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
      throw error;
    }
  }
}
