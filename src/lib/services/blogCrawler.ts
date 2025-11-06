import { fetchPageContent } from './urlContentFetcher';
import * as cheerio from 'cheerio';

interface CrawlResult {
  title: string;
  content: string;
  images: string[];
  publishedAt?: Date;
}

export class BlogCrawlerService {
  // 네이버 블로그 URL 패턴 (모든 형식 지원)
  static isNaverBlogUrl(url: string): boolean {
    const pattern1 = /^https?:\/\/(m\.)?blog\.naver\.com\/[^\/]+\/\d+/;
    const pattern2 = /^https?:\/\/(m\.)?blog\.naver\.com\/PostView\.naver\?.*blogId=.*&logNo=\d+/;
    const pattern3 = /^https?:\/\/(m\.)?blog\.naver\.com\/[^\/]+\?.*Redirect=Log.*&logNo=\d+/;

    return pattern1.test(url) || pattern2.test(url) || pattern3.test(url);
  }

  static async crawlNaverBlog(url: string): Promise<CrawlResult> {
    if (!this.isNaverBlogUrl(url)) {
      throw new Error('올바른 네이버 블로그 포스트 URL을 입력해주세요.');
    }

    try {
      // 기존 검증된 urlContentFetcher 사용 (iframe + RSS fallback)
      const pageContent = await fetchPageContent(url);

      if (!pageContent) {
        throw new Error('블로그 콘텐츠를 가져올 수 없습니다.');
      }

      if (!pageContent.content || pageContent.content.length < 100) {
        throw new Error('블로그 콘텐츠가 너무 짧습니다. (최소 100자 이상 필요)');
      }

      // 이미지 추출을 위해 HTML 한 번 더 가져오기 (선택적)
      const images = await this.extractImages(url);

      return {
        title: pageContent.title || '제목 없음',
        content: pageContent.content.slice(0, 10000),
        images: images.slice(0, 10),
      };
    } catch (error: any) {
      if (error.message.includes('가져올 수 없습니다')) {
        throw error;
      }
      throw new Error(`블로그 크롤링 실패: ${error.message}`);
    }
  }

  private static async extractImages(url: string): Promise<string[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const $ = cheerio.load(html);
      const images: string[] = [];

      // 다양한 이미지 선택자 시도
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo')) {
          images.push(src);
        }
      });

      return images;
    } catch (error) {
      console.warn('Image extraction failed:', error);
      return [];
    }
  }
}
