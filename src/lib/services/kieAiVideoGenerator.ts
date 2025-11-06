import axios from 'axios';

interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: number;
}

export class KieAiVideoGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.kie.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/veo/generate`,
        {
          prompt: request.prompt,
          model: 'veo3_fast', // 빠른 생성 모드
          aspect_ratio: request.aspectRatio,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const { taskId } = response.data;

      if (!taskId) {
        throw new Error('kie.ai API에서 taskId를 받지 못했습니다.');
      }

      return taskId;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.message;

        if (status === 401) {
          throw new Error('kie.ai API 키가 유효하지 않습니다.');
        } else if (status === 429) {
          throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          throw new Error(`영상 생성 요청 실패: ${message}`);
        }
      }
      throw error;
    }
  }

  async pollTaskStatus(
    taskId: string,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      try {
        const response = await axios.get(`${this.baseUrl}/veo/task/${taskId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        const { status, videoUrl, error } = response.data;

        if (status === 'completed' && videoUrl) {
          return videoUrl;
        }

        if (status === 'failed') {
          throw new Error(`영상 생성 실패: ${error || '알 수 없는 오류'}`);
        }

        // pending, processing 상태면 계속 대기
        console.log(
          `[kie.ai] Task ${taskId} status: ${status} (${attempt + 1}/${maxAttempts})`
        );
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error('작업을 찾을 수 없습니다. taskId를 확인해주세요.');
        }
        // 네트워크 오류 등은 재시도
        console.error(`[kie.ai] Polling error (attempt ${attempt + 1}):`, error.message);
      }
    }

    throw new Error(
      `영상 생성 타임아웃 (최대 ${(maxAttempts * intervalMs) / 1000 / 60}분)`
    );
  }

  async generateAndWaitForVideo(request: VideoGenerationRequest): Promise<string> {
    const taskId = await this.generateVideo(request);
    const videoUrl = await this.pollTaskStatus(taskId);
    return videoUrl;
  }
}
