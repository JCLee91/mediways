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
      console.log('[kie.ai] Generating video with prompt:', request.prompt.slice(0, 100));

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

      console.log('[kie.ai] API Response:', JSON.stringify(response.data, null, 2));

      // kie.ai API는 { code, msg, data: { taskId } } 형식으로 응답
      const responseData = response.data.data || response.data;
      const finalTaskId = responseData.taskId || responseData.task_id || responseData.id;

      if (!finalTaskId) {
        console.error('[kie.ai] No taskId in response:', response.data);
        throw new Error(`kie.ai API에서 taskId를 받지 못했습니다. Response: ${JSON.stringify(response.data)}`);
      }

      console.log('[kie.ai] Task created:', finalTaskId);
      return finalTaskId;
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
        const response = await axios.get(
          `${this.baseUrl}/veo/record-info?taskId=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`[kie.ai] Polling attempt ${attempt + 1}:`, JSON.stringify(response.data, null, 2));

        // kie.ai는 { code, data: { successFlag, resultUrls } } 형식
        const responseData = response.data.data || response.data;
        const { successFlag, resultUrls } = responseData;

        // successFlag: 0=생성중, 1=성공, 2/3=실패
        if (successFlag === 1 && resultUrls) {
          // resultUrls는 JSON 문자열 배열
          const urls = JSON.parse(resultUrls);
          if (urls && urls.length > 0) {
            console.log(`[kie.ai] Video completed:`, urls[0]);
            return urls[0];
          }
        }

        if (successFlag === 2 || successFlag === 3) {
          throw new Error(`영상 생성 실패 (flag: ${successFlag})`);
        }

        // successFlag === 0: 계속 대기
        console.log(
          `[kie.ai] Task ${taskId} generating... (${attempt + 1}/${maxAttempts})`
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

  async extendVideo(previousTaskId: string, prompt: string): Promise<string> {
    try {
      console.log('[kie.ai] Extending video from task:', previousTaskId);
      console.log('[kie.ai] Extension prompt:', prompt.slice(0, 100));

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

      console.log('[kie.ai] Extend API Response:', JSON.stringify(response.data, null, 2));

      const responseData = response.data.data || response.data;
      const finalTaskId = responseData.taskId || responseData.task_id || responseData.id;

      if (!finalTaskId) {
        console.error('[kie.ai] No taskId in extend response:', response.data);
        throw new Error(`영상 확장 실패: taskId를 받지 못했습니다.`);
      }

      console.log('[kie.ai] Extension task created:', finalTaskId);
      return finalTaskId;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.message;
        throw new Error(`영상 확장 요청 실패: ${message}`);
      }
      throw error;
    }
  }

  async generateAndWaitForVideo(request: VideoGenerationRequest): Promise<string> {
    const taskId = await this.generateVideo(request);
    const videoUrl = await this.pollTaskStatus(taskId);
    return videoUrl;
  }
}
