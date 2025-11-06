import { BlogAnalyzer } from '@/lib/blog-analyzer';
import { validateBlogId } from '@/types/blog-analysis';
import type { BlogAnalysisResult } from '@/types/blog-analysis';

/**
 * 블로그 분석 서비스 - MVP 버전
 */
export async function analyzeBlog(blogId: string): Promise<BlogAnalysisResult | null> {
  try {
    validateBlogId(blogId);
    const analyzer = new BlogAnalyzer();
    return await analyzer.analyzeBlog(blogId);
  } catch (error) {
    console.error('Blog analysis failed:', error);
    return null;
  }
}

// 기존 클래스 기반 API와의 호환성을 위한 래퍼
export const blogAnalysisService = {
  analyzeBlog: async (userId: string, blogId: string) => analyzeBlog(blogId)
};
