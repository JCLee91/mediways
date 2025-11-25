import axios from 'axios';
import { logger } from '@/lib/utils/logger';

interface GrokVideoRequest {
    prompt: string;
    mode?: 'fun' | 'normal' | 'spicy';
    aspectRatio?: '16:9' | '9:16';
}

export class GrokImagineService {
    private apiKey: string;
    private baseUrl = 'https://api.kie.ai/api/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateVideo(request: GrokVideoRequest): Promise<string> {
        const payload = {
            model: 'grok-imagine/text-to-video',
            input: {
                prompt: request.prompt,
                mode: request.mode || 'normal',
            }
        };

        console.log(`[Grok] Generating video with mode ${payload.input.mode}. Prompt: ${payload.input.prompt.substring(0, 50)}...`);

        const response = await axios.post(
            `${this.baseUrl}/jobs/createTask`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        const { code, message, data } = response.data;

        if (code !== 200) {
            throw new Error(`Grok API error (code ${code}): ${message}`);
        }

        if (!data.taskId) {
            throw new Error('No taskId received from Grok API');
        }

        logger.info(`[Grok] Video task created: ${data.taskId}`);
        console.log(`[Grok] Task created: ${data.taskId}`);
        return data.taskId;
    }

    async pollUntilComplete(taskId: string): Promise<string> {
        const maxAttempts = 60;
        const intervalMs = 5000;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));

            const response = await axios.get(
                `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            const { code, data } = response.data;

            if (code !== 200 || !data) {
                continue;
            }

            const state = data.state;

            if (state === 'success') {
                // Parse resultJson string
                const resultJson = JSON.parse(data.resultJson || '{}');
                const resultUrls = resultJson.resultUrls;

                if (resultUrls && Array.isArray(resultUrls) && resultUrls.length > 0) {
                    return resultUrls[0];
                }
            }

            if (state === 'failed') {
                throw new Error(`Video generation failed: ${data.failMsg || 'Unknown error'}`);
            }
        }

        throw new Error('Timeout while waiting for video generation');
    }
}
