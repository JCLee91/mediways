export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { SEOAnalysisService } from '@/lib/services/seoAnalysisService';
import type { SEOAnalysisInput } from '@/lib/services/seoAnalysisService';

// SEO 분석 서비스 싱글톤 인스턴스 (메모리 효율성을 위해)
let seoAnalysisServiceInstance: SEOAnalysisService | null = null;

function getSEOAnalysisService(): SEOAnalysisService {
  if (!seoAnalysisServiceInstance) {
    seoAnalysisServiceInstance = new SEOAnalysisService();
  }
  return seoAnalysisServiceInstance;
}

/**
 * SEO 분석 API - POST /api/seo-analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const { title, content, description, targetKeywords, url } = body;
    
    if (!title && !content) {
      return NextResponse.json(
        { 
          error: '제목 또는 콘텐츠가 필요합니다',
          code: 'MISSING_INPUT'
        },
        { status: 400 }
      );
    }

    // SEO 분석 입력 데이터 구성
    const analysisInput: SEOAnalysisInput = {
      title: title || '',
      content: content || '',
      description: description || '',
      targetKeywords: Array.isArray(targetKeywords) ? targetKeywords : [],
      url: url || undefined
    };

    // SEO 분석 수행
    const seoService = getSEOAnalysisService();
    const result = await seoService.analyze(analysisInput);

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SEO Analysis API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'SEO 분석 중 오류가 발생했습니다',
        code: 'ANALYSIS_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * URL 기반 SEO 분석 API - GET /api/seo-analysis?url=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { 
          error: 'URL 파라미터가 필요합니다',
          code: 'MISSING_URL'
        },
        { status: 400 }
      );
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { 
          error: '유효하지 않은 URL입니다',
          code: 'INVALID_URL'
        },
        { status: 400 }
      );
    }

    const seoService = getSEOAnalysisService();

    const result = await seoService.analyzeUrl(url);

    if (result.content.wordCount === 0 && result.content.charCount === 0) {
      return NextResponse.json(
        {
          error: '해당 URL의 콘텐츠를 불러오지 못했습니다',
          code: 'CONTENT_FETCH_FAILED'
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('URL SEO Analysis API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'URL SEO 분석 중 오류가 발생했습니다',
        code: 'URL_ANALYSIS_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * 배치 SEO 분석 API - POST /api/seo-analysis/batch
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { 
          error: '배치 분석을 위한 items 배열이 필요합니다',
          code: 'MISSING_ITEMS'
        },
        { status: 400 }
      );
    }

    if (body.items.length > 10) {
      return NextResponse.json(
        { 
          error: '한 번에 최대 10개 항목까지 분석 가능합니다',
          code: 'TOO_MANY_ITEMS'
        },
        { status: 400 }
      );
    }

    // 배치 분석 수행
    const seoService = getSEOAnalysisService();
    const results = await seoService.analyzeBatch(body.items);

    return NextResponse.json({
      success: true,
      data: {
        results,
        totalCount: results.length,
        successCount: results.filter((r: any) => r.overallScore > 0).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch SEO Analysis API Error:', error);
    
    return NextResponse.json(
      { 
        error: '배치 SEO 분석 중 오류가 발생했습니다',
        code: 'BATCH_ANALYSIS_ERROR',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
