import axios from 'axios';

interface MusicGenerationRequest {
  prompt: string;
  instrumental?: boolean;
  model?: 'V3_5' | 'V4_5';
  callBackUrl?: string;
}

export class SunoMusicGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.kie.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateMusic(request: MusicGenerationRequest): Promise<string> {
    const payload = {
      prompt: request.prompt,
      instrumental: request.instrumental ?? true, // 기본값: 가사 없는 배경음악
      model: request.model || 'V3_5',
      customMode: false,
      ...(request.callBackUrl && { callBackUrl: request.callBackUrl }),
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/generate`,
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
        throw new Error(`Suno API 오류 (code ${code}): ${msg}`);
      }

      if (!data?.taskId) {
        throw new Error('taskId를 받지 못했습니다.');
      }

      console.log(`[Suno] Music task created: ${data.taskId}`);
      return data.taskId;
    } catch (error: any) {
      console.error('[Suno] Generate error:', error.response?.data || error.message);
      throw error;
    }
  }

  async pollUntilComplete(taskId: string): Promise<string> {
    const maxAttempts = 60; // 5분 대기
    const intervalMs = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      try {
        const response = await axios.get(
          `${this.baseUrl}/generate/record-info?taskId=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        );

        const { code, data } = response.data;

        if (code !== 200) continue;

        // 상태 확인: SUCCESS, PENDING 등
        const status = data.status;
        
        if (status === 'SUCCESS' || status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') {
          // 성공 시 sunoData 배열에서 오디오 URL 추출
          const sunoData = data.response?.sunoData;
          if (Array.isArray(sunoData) && sunoData.length > 0) {
            const audioUrl = sunoData[0].audioUrl;
            if (audioUrl) return audioUrl;
          }
        } else if (status === 'GENERATE_AUDIO_FAILED' || status === 'CREATE_TASK_FAILED') {
           throw new Error(`음악 생성 실패: ${data.errorMessage || 'Unknown error'}`);
        }
        
        // 진행 중이면 계속 루프 (PENDING)
      } catch (error) {
        console.warn(`[Suno] Polling error (attempt ${i + 1}):`, error);
        // 일시적 오류는 무시하고 계속 시도
      }
    }

    throw new Error('Suno 음악 생성 타임아웃');
  }
}





