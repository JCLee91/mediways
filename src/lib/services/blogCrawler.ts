import axios from 'axios';
import * as cheerio from 'cheerio';

interface CrawlResult {
  title: string;
  content: string;
  images: string[];
  publishedAt?: Date;
}

export class BlogCrawlerService {
  private static readonly NAVER_BLOG_PATTERN =
    /^https?:\/\/(m\.)?blog\.naver\.com\/[^\/]+\/\d+/;

  static isNaverBlogUrl(url: string): boolean {
    return this.NAVER_BLOG_PATTERN.test(url);
  }

  static async crawlNaverBlog(url: string): Promise<CrawlResult> {
    if (!this.isNaverBlogUrl(url)) {
      throw new Error('올바른 네이버 블로그 포스트 URL을 입력해주세요.');
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // iframe 콘텐츠 추출 (네이버 블로그 구조)
      const iframeSrc = $('iframe#mainFrame').attr('src');
      if (!iframeSrc) {
        throw new Error('블로그 콘텐츠를 찾을 수 없습니다.');
      }

      // iframe 내부 HTML 다시 가져오기
      const fullIframeUrl = iframeSrc.startsWith('http')
        ? iframeSrc
        : `https://blog.naver.com${iframeSrc}`;

      const iframeResponse = await axios.get(fullIframeUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const iframe$ = cheerio.load(iframeResponse.data);

      // 제목 추출 (다양한 선택자 시도)
      const title =
        iframe$('.se-title-text').text().trim() ||
        iframe$('.pcol1').text().trim() ||
        iframe$('h3.se_textarea').text().trim() ||
        '제목 없음';

      // 본문 추출
      const contentParagraphs: string[] = [];

      // 다양한 선택자로 본문 추출 시도
      iframe$('.se-main-container .se-text-paragraph').each((_, el) => {
        const text = iframe$(el).text().trim();
        if (text) contentParagraphs.push(text);
      });

      // 대체 선택자
      if (contentParagraphs.length === 0) {
        iframe$('.se-main-container p, .se-main-container div.se-text').each(
          (_, el) => {
            const text = iframe$(el).text().trim();
            if (text) contentParagraphs.push(text);
          }
        );
      }

      const content = contentParagraphs.join('\n\n').slice(0, 10000);

      if (!content || content.length < 100) {
        throw new Error(
          '블로그 콘텐츠가 너무 짧습니다. (최소 100자 이상 필요)'
        );
      }

      // 이미지 추출
      const images: string[] = [];
      iframe$('.se-main-container img').each((_, el) => {
        const src =
          iframe$(el).attr('src') || iframe$(el).attr('data-lazy-src');
        if (src && src.startsWith('http')) {
          images.push(src);
        }
      });

      return {
        title,
        content,
        images: images.slice(0, 10), // 최대 10개
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('블로그 로딩 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      if (error.response?.status === 404) {
        throw new Error('블로그 글을 찾을 수 없습니다. URL을 확인해주세요.');
      }
      throw error;
    }
  }
}
