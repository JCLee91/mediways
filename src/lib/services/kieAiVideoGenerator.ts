import axios from 'axios';

interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: number;
  callBackUrl?: string; // Callback URL (optional)
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

      const payload: Record<string, any> = {
        prompt: request.prompt,
        model: 'veo3_fast',
        aspectRatio: request.aspectRatio, // camelCase (문서 표준)
        // videoLength는 공식 문서에 없는 파라미터이므로 제거
        // 프롬프트에서 "8-second clip" 등으로 길이 제어
      };

      // callBackUrl이 제공된 경우 추가
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

      console.log('[kie.ai] API Response:', JSON.stringify(response.data, null, 2));

      // kie.ai API는 { code, msg, data: { taskId } } 형식으로 응답
      // HTTP 200이어도 response.data.code !== 200이면 오류
      const { code, msg, data } = response.data;

      if (code !== 200) {
        console.error('[kie.ai] API error (code !== 200):', { code, msg });
        throw new Error(`kie.ai API 오류 (code ${code}): ${msg}`);
      }

      const responseData = data || response.data;
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
        } else if (status === 402) {
          throw new Error('크레딧이 부족합니다. kie.ai 계정에서 크레딧을 충전해주세요.');
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

  async extendVideo(previousTaskId: string, prompt: string, callBackUrl?: string): Promise<string> {
    try {
      console.log('[kie.ai] Extending video from task:', previousTaskId);
      console.log('[kie.ai] Extension prompt:', prompt.slice(0, 100));

      const extendPayload: Record<string, any> = {
        taskId: previousTaskId,
        prompt: prompt,
      };

      // callBackUrl이 제공된 경우 추가
      if (callBackUrl) {
        extendPayload.callBackUrl = callBackUrl;
      }

      const response = await axios.post(
        `${this.baseUrl}/veo/extend`,
        extendPayload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('[kie.ai] Extend API Response:', JSON.stringify(response.data, null, 2));

      // HTTP 200이어도 response.data.code !== 200이면 오류
      const { code, msg, data } = response.data;

      if (code !== 200) {
        console.error('[kie.ai] Extend API error (code !== 200):', { code, msg });
        throw new Error(`kie.ai 영상 확장 오류 (code ${code}): ${msg}`);
      }

      const responseData = data || response.data;
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

        if (status === 402) {
          throw new Error('크레딧이 부족합니다. kie.ai 계정에서 크레딧을 충전해주세요.');
        } else if (status === 501) {
          throw new Error('영상 확장 작업이 실패했습니다. 원본 영상을 확인해주세요.');
        } else {
          throw new Error(`영상 확장 요청 실패: ${message}`);
        }
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
