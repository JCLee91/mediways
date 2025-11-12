import axios from 'axios';
import { logger } from '@/lib/utils/logger';

interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: number;
  callBackUrl?: string;
}

export class KieAiVideoGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.kie.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<string> {
    const payload: Record<string, any> = {
      prompt: request.prompt,
      model: 'veo3_fast',
      aspectRatio: request.aspectRatio,
    };

    if (request.callBackUrl) {
      payload.callBackUrl = request.callBackUrl;
    }

    const response = await axios.post(
      `${this.baseUrl}/veo/generate`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const { code, msg, data } = response.data;

    if (code !== 200) {
      throw new Error(`kie.ai API 오류 (code ${code}): ${msg}`);
    }

    if (!data.taskId) {
      throw new Error('taskId를 받지 못했습니다.');
    }

    logger.info(`[kie.ai] Video task created: ${data.taskId}`);
    return data.taskId;
  }

  async extendVideo(previousTaskId: string, prompt: string, callBackUrl?: string): Promise<string> {
    const payload: Record<string, any> = {
      taskId: previousTaskId,
      prompt: prompt,
    };

    if (callBackUrl) {
      payload.callBackUrl = callBackUrl;
    }

    const response = await axios.post(
      `${this.baseUrl}/veo/extend`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const { code, msg, data } = response.data;

    if (code !== 200) {
      throw new Error(`kie.ai 영상 확장 오류 (code ${code}): ${msg}`);
    }

    if (!data.taskId) {
      throw new Error('taskId를 받지 못했습니다.');
    }

    logger.info(`[kie.ai] Extend task created: ${data.taskId}`);
    return data.taskId;
  }
}
