export const runtime = 'nodejs';

// 블로그 분석 API 엔드포인트 - 리팩토링된 버전
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blogAnalysisService } from '@/lib/services/blogAnalysisService';
import { 
  BlogAnalysisError, 
  validateBlogId
} from '@/types/blog-analysis';
import { BlogAnalysisApiRequest, BlogAnalysisApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: '인증이 필요합니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 401 }
      );
    }

    // 요청 데이터 파싱 및 검증
    let requestData: BlogAnalysisApiRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: '올바르지 않은 요청 형식입니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 400 }
      );
    }

    const { blogId, options = {} } = requestData;

    // 블로그 ID 검증
    try {
      validateBlogId(blogId);
    } catch (error) {
      if (error instanceof BlogAnalysisError) {
        return NextResponse.json(
          { 
            success: false, 
            error: error.message 
          } satisfies BlogAnalysisApiResponse,
          { status: error.statusCode }
        );
      }
      throw error;
    }

    // 블로그 분석 서비스 호출
    try {
      const analysisResult = await blogAnalysisService.analyzeBlog(user.id, blogId);
      
      if (!analysisResult) {
        return NextResponse.json(
          { 
            success: false, 
            error: '블로그 분석에 실패했습니다.' 
          } satisfies BlogAnalysisApiResponse,
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: analysisResult,
        cached: false,
        source: 'fresh'
      } satisfies BlogAnalysisApiResponse);

    } catch (error) {
      if (error instanceof BlogAnalysisError) {
        return NextResponse.json(
          { 
            success: false, 
            error: error.message 
          } satisfies BlogAnalysisApiResponse,
          { status: error.statusCode }
        );
      }
      
      console.error('Blog analysis API error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: '블로그 분석 중 오류가 발생했습니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Blog analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      } satisfies BlogAnalysisApiResponse,
      { status: 500 }
    );
  }
}

// GET 요청으로 캐시된 분석 결과 조회 (간소화)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: '인증이 필요합니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const blogId = url.searchParams.get('blogId');

    if (!blogId) {
      return NextResponse.json(
        { 
          success: false, 
          error: '블로그 ID가 필요합니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 400 }
      );
    }

    // 서비스를 통해 분석 결과 조회 (캐시된 결과 포함)
    const result = await blogAnalysisService.analyzeBlog(user.id, blogId);
    
    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: '분석 결과를 찾을 수 없습니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      cached: true,
      source: 'db'
    } satisfies BlogAnalysisApiResponse);

  } catch (error) {
    console.error('Blog analysis GET API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      } satisfies BlogAnalysisApiResponse,
      { status: 500 }
    );
  }
}

// 캐시 무효화 (관리용) - 서비스 레이어로 위임
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: '인증이 필요합니다.' 
        } satisfies BlogAnalysisApiResponse,
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const blogId = url.searchParams.get('blogId');

    if (blogId) {
      // 특정 블로그 캐시 무효화
      // Cache invalidation removed for MVP simplicity
      return NextResponse.json({
        success: true
      } satisfies BlogAnalysisApiResponse);
    } else {
      // 사용자의 모든 블로그 캐시 무효화
      // User cache clearing removed for MVP simplicity
      const deletedCount = 0;
      return NextResponse.json({
        success: true
      } satisfies BlogAnalysisApiResponse);
    }

  } catch (error) {
    console.error('Blog analysis DELETE API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      } satisfies BlogAnalysisApiResponse,
      { status: 500 }
    );
  }
}
