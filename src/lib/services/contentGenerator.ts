import { OpenAI } from 'openai';
import { 
  blogPrompts, 
  snsPrompts, 
  youtubePrompts, 
  copywritingPrompts
} from '@/lib/prompts';
import type { GenerateContentRequest, BlogData, SNSData, YoutubeData, CopywritingData } from '@/types/api';
import { APIError, validateTone } from '@/types/api';

export class ContentGeneratorService {
  private openai?: OpenAI;

  constructor() {
    // OpenAI 클라이언트는 실제 호출 시점에만 필요
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateContent(request: GenerateContentRequest) {
    const { systemPrompt, userPrompt } = this.getPrompts(request);

    // system + user 프롬프트 병합 (Responses API는 단일 input 사용)
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      if (!this.openai) {
        throw new APIError('OpenAI API key not configured', 500, 'CONFIG_ERROR');
      }

      // Responses API로 변경 (GPT-5-nano 사용)
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano',
        stream: true,
        input: combinedPrompt,
        reasoning: {
          effort: 'minimal'  // reasoning 토큰 최소화
        },
        text: {
          verbosity: 'medium'  // 블로그/콘텐츠는 적당한 길이 필요
        }
      });

      return response;
    } catch (error: any) {
      console.error('OpenAI API Error:', error);

      throw new APIError(
        'AI 서비스 오류입니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.',
        error.status || 500,
        'OPENAI_ERROR'
      );
    }
  }

  getPrompts(request: GenerateContentRequest): { systemPrompt: string; userPrompt: string } {
    const { type, subType, data } = request;

    if (type === 'blog') {
      const blogData = data as BlogData;
      const promptSet = blogPrompts[subType as keyof typeof blogPrompts];
      
      if (!promptSet) {
        throw new APIError('잘못된 블로그 타입입니다', 400, 'INVALID_BLOG_TYPE');
      }

      // 말투 검증
      validateTone(blogData.tone);

      return {
        systemPrompt: promptSet.system,
        userPrompt: promptSet.userPrompt(blogData)
      };
    } 
    
    if (type === 'sns') {
      const snsData = data as SNSData;
      const promptSet = snsPrompts[snsData.snsType as keyof typeof snsPrompts];
      
      if (!promptSet) {
        throw new APIError('지원하지 않는 SNS 타입입니다', 400, 'INVALID_SNS_TYPE');
      }

      return {
        systemPrompt: promptSet.system,
        userPrompt: promptSet.userPrompt(snsData)
      };
    }

    if (type === 'youtube') {
      const youtubeData = data as YoutubeData;
      
      // 말투 검증
      validateTone(youtubeData.tone);

      return {
        systemPrompt: youtubePrompts.system,
        userPrompt: youtubePrompts.userPrompt(youtubeData)
      };
    }

    if (type === 'copywriting') {
      const copyData = data as CopywritingData;
      const promptSet = copywritingPrompts[copyData.language];
      
      if (!promptSet) {
        throw new APIError('지원하지 않는 언어입니다', 400, 'INVALID_LANGUAGE');
      }

      return {
        systemPrompt: promptSet.system,
        userPrompt: promptSet.userPrompt(copyData)
      };
    }

    throw new APIError('잘못된 콘텐츠 타입입니다', 400, 'INVALID_CONTENT_TYPE');
  }

  // Mock 스트림 생성 (개발용)
  createMockStream(userPrompt: string): ReadableStream {
    const encoder = new TextEncoder();
    const mockText = `[개발 모드] OpenAI API 키가 설정되지 않았습니다.

실제 사용을 위해서는 .env.local 파일에 OPENAI_API_KEY를 설정해주세요.

요청된 프롬프트:
${userPrompt}

테스트 콘텐츠:
의료 광고 콘텐츠 생성 API가 정상적으로 작동하고 있습니다.
이것은 테스트 메시지입니다.`;

    return new ReadableStream({
      async start(controller) {
        // ai 패키지가 기대하는 형식으로 전송
        const chunks = mockText.split('');
        for (const char of chunks) {
          const formattedChunk = `0:"${char.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
          controller.enqueue(encoder.encode(formattedChunk));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        controller.close();
      },
    });
  }
}