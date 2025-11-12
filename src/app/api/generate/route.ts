import { createClient } from '@/lib/supabase/server';
import { ContentGeneratorService } from '@/lib/services/contentGenerator';
import { rateLimiter } from '@/lib/services/rateLimiter';
import type { GenerateContentRequest } from '@/types/api';
import { APIError } from '@/types/api';
import { OpenAI } from 'openai';

// Node.js Runtime - required for Supabase compatibility (Edge Runtime shows warnings)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60초로 타임아웃 증가

export async function POST(req: Request) {
  try {
    // 1. 인증 검사
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '로그인이 필요합니다' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Rate limiting 검사 (개발 모드에서는 건너뛰기)
    if (process.env.NODE_ENV === 'production') {
      const { allowed, retryAfter } = await rateLimiter.checkLimit(user.id, '/api/generate');
      if (!allowed) {
        return new Response(JSON.stringify({ 
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter 
        }), { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() || '60'
          }
        });
      }
    }

    // 3. Request 파싱 및 검증
    const body = await req.json() as GenerateContentRequest;
    
    if (!body.type || !body.data) {
      return new Response(JSON.stringify({ error: '필수 필드가 누락되었습니다' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 콘텐츠 생성 서비스 호출
    try {
      const generator = new ContentGeneratorService();
      
      // 개발 모드에서 OpenAI API 키가 없는 경우 모의 스트림 반환
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key') {
        const { userPrompt } = generator.getPrompts(body);
        
        // Mock 데이터도 데이터베이스에 저장
        const mockContent = `[개발 모드] 테스트 콘텐츠입니다.\n\n${userPrompt}`;
        
        try {
          const generationData = {
            user_id: user.id,
            type: body.type,
            sub_type: body.subType || null,
            input_data: body.data,
            output_content: mockContent
          };
          
          const { data, error: saveError } = await supabase
            .from('generations')
            .insert(generationData);
            
          if (saveError) {
            console.error('[API] Mock database save error:', saveError);
          }
        } catch (error) {
          console.error('[API] Failed to save mock generation log:', error);
        }
        
        const mockStream = generator.createMockStream(userPrompt);
        return new Response(mockStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      }

      const response = await generator.generateContent(body);
      // Stream response from OpenAI Responses API

      // 스트리밍 응답 처리 - ai 패키지가 기대하는 형식으로 변환
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = '';
          const encoder = new TextEncoder();
          let lastActivityTime = Date.now();

          // 타임아웃 체크 (30초 동안 데이터 없으면 에러)
          const timeoutCheck = setInterval(() => {
            if (Date.now() - lastActivityTime > 30000) {
              clearInterval(timeoutCheck);
              controller.error(new Error('Stream timeout - no data received for 30 seconds'));
            }
          }, 5000);

          try {
            // Responses API 스트림 이벤트 처리
            for await (const event of response) {
              lastActivityTime = Date.now();

              // response.output_text.delta 이벤트에서 텍스트 추출
              if (event.type === 'response.output_text.delta') {
                const content = event.delta || '';
                if (content) {
                  fullContent += content;
                  // ai 패키지가 기대하는 형식으로 스트리밍
                  const formattedChunk = `0:"${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
                  controller.enqueue(encoder.encode(formattedChunk));
                }
              }
            }
            
            // 스트리밍이 완료되면 로그 저장
            try {
              const generationData = {
                user_id: user.id,
                type: body.type,
                sub_type: body.subType || null,
                input_data: body.data,
                output_content: fullContent
              };
              
              const { data, error: saveError } = await supabase
                .from('generations')
                .insert(generationData);
                
              if (saveError) {
                console.error('[API] Database save error:', saveError);
              } else {
                // Content saved successfully
              }
            } catch (error) {
              console.error('[API] Failed to save generation log:', error);
            }
          } catch (error) {
            console.error('[API] Stream error:', error);
            controller.error(error);
          } finally {
            clearInterval(timeoutCheck);
            controller.close();
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
      
    } catch (error) {
      console.error('[API] Error in content generation:', error);
      if (error instanceof APIError) {
        return new Response(JSON.stringify({ 
          error: error.message,
          code: error.code 
        }), { 
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.error('[API] Unexpected error in generate API:', error);
      return new Response(JSON.stringify({ 
        error: '콘텐츠 생성 중 오류가 발생했습니다',
        code: 'INTERNAL_ERROR'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(JSON.stringify({ 
      error: '요청 처리 중 오류가 발생했습니다',
      code: 'REQUEST_ERROR'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}