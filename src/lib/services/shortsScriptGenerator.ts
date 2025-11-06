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
2. 영상 세그먼트: 3-4개의 8초 클립 구성
   - 각 세그먼트는 독립적인 장면
   - 스토리: 시작(문제/흥미) → 중간(전개/설명) → 끝(해결/결론)
3. videoPrompt: 각 클립의 영상 생성용 프롬프트
   - 영어로 작성
   - 의료 환경 묘사 (병원, 진료실, 환자 등)
   - 구체적이고 시각적인 장면 설명
   - 예: "A modern medical clinic interior with soft lighting, professional doctor consulting with patient, clean and bright atmosphere"

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
      "title": "오프닝 - 문제 제시",
      "content": "첫 번째 클립 내용 (1-2문장)",
      "order": 0,
      "videoPrompt": "A medical clinic waiting room, patients sitting..."
    },
    {
      "title": "중간 - 핵심 설명",
      "content": "두 번째 클립 내용",
      "order": 1,
      "videoPrompt": "Close-up of professional doctor explaining..."
    },
    {
      "title": "마무리 - 결론",
      "content": "세 번째 클립 내용",
      "order": 2,
      "videoPrompt": "Happy patient receiving consultation..."
    }
  ],
  "totalDuration": 24
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
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

      if (result.segments.length < 3 || result.segments.length > 4) {
        throw new Error('세그먼트는 3-4개여야 합니다.');
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
