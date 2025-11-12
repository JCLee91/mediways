import { fetchPageContent } from './urlContentFetcher';

interface CrawlResult {
  title: string;
  content: string;
  images: string[];
  publishedAt?: Date;
}

export class BlogCrawlerService {
  static async crawlNaverBlog(url: string): Promise<CrawlResult> {
    const pageContent = await fetchPageContent(url);

    if (!pageContent || !pageContent.content) {
      throw new Error('블로그 콘텐츠를 가져올 수 없습니다.');
    }

    return {
      title: pageContent.title || '제목 없음',
      content: pageContent.content.slice(0, 10000),
      images: [],
    };
  }
}
