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

    console.log(`[KieAi] Generating video with model ${payload.model}. Prompt: ${payload.prompt.substring(0, 50)}...`);

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
    console.log(`[KieAi] Task created: ${data.taskId}`);
    return data.taskId;
  }

  async extendVideo(previousTaskId: string, prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/veo/extend`,
      {
        taskId: previousTaskId,
        prompt: prompt,
      },
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
      throw new Error(`영상 확장 실패 (code ${code}): ${msg}`);
    }

    return data.taskId;
  }

  async pollUntilComplete(taskId: string): Promise<string> {
    const maxAttempts = 60;
    const intervalMs = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const response = await axios.get(
        `${this.baseUrl}/veo/record-info?taskId=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const { successFlag, resultUrls } = response.data.data || response.data;

      if (successFlag === 1 && resultUrls) {
        const urls = JSON.parse(resultUrls);
        return urls[0];
      }

      if (successFlag === 2 || successFlag === 3) {
        throw new Error('영상 생성 실패');
      }
    }

    throw new Error('타임아웃');
  }
}
