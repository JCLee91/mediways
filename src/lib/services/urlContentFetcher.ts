export interface PageContent {
  title: string;
  description?: string;
  content: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

function createPlaceholderContent(url: string): PageContent {
  return {
    title: 'URL 분석 정보를 불러오지 못했습니다',
    description: '본문을 가져오지 못해 기본 안내 문구로 대체되었습니다.',
    content: `해당 페이지(${url})의 상세 본문을 찾지 못했습니다. RSS 요약이나 직접 입력으로 내용을 보완하면 더 정확한 분석이 가능합니다.`
  };
}

function stripHtml(html: string): string {
  return html
    // CDATA 태그 제거 (내용은 유지)
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const metaRegex = new RegExp(`<meta[^>]*(?:property|name)=\"${key}\"[^>]*content=\"([^\"]*)\"[^>]*>`, 'i');
    const match = html.match(metaRegex);
    if (match && match[1]) {
      return stripHtml(match[1]);
    }
  }
  return undefined;
}

function extractTitle(html: string): string {
  const metaTitle = extractMeta(html, ['og:title']);
  if (metaTitle) {
    return metaTitle;
  }
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return stripHtml(titleMatch[1]);
  }
  return '';
}

function extractDescription(html: string): string | undefined {
  const meta = extractMeta(html, ['og:description', 'description']);
  return meta ? stripHtml(meta) : undefined;
}

function extractMainContent(html: string): string {
  const containerPatterns = [
    /<div[^>]*class=\"[^\"]*se-main-container[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=\"postViewArea\"[^>]*>([\s\S]*?)<div[^>]*id=\"postRcmd\"/i,
    /<div[^>]*class=\"post-view[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of containerPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return stripHtml(match[1]);
    }
  }

  return stripHtml(html);
}

function extractNaverBlogInfo(parsed: URL): { blogId?: string; logNo?: string } {
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    return { blogId: segments[0], logNo: segments[1] };
  }
  const logNo = parsed.searchParams.get('logNo') || undefined;
  const blogId = parsed.searchParams.get('blogId') || (segments.length === 1 ? segments[0] : undefined);
  return { blogId, logNo };
}

function normalizeUrl(targetUrl: string): string {
  const parsed = new URL(targetUrl);
  if (parsed.hostname.includes('blog.naver.com')) {
    const { blogId, logNo } = extractNaverBlogInfo(parsed);
    if (blogId && logNo) {
      return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&viewType=pc`;
    }
  }
  return parsed.toString();
}

async function fetchFromNaverRSS(blogId: string, logNo?: string): Promise<PageContent | null> {
  try {
    const response = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
    let match;
    const items: Array<{ title: string; link: string; description: string }> = [];

    while ((match = itemRegex.exec(xmlText)) !== null) {
      items.push({
        title: stripHtml(match[1] || ''),
        link: match[2] || '',
        description: stripHtml(match[3] || '')
      });
    }

    if (items.length === 0) return null;

    let item = items[0];
    if (logNo) {
      const found = items.find(entry => entry.link.includes(logNo));
      if (found) {
        item = found;
      }
    }

    return {
      title: item.title,
      description: item.description,
      content: item.description.length > 0 ? item.description : item.title
    };
  } catch (error) {
    console.error('Failed RSS fallback:', error);
    return null;
  }
}

export async function fetchPageContent(targetUrl: string): Promise<PageContent | null> {
  if (typeof fetch === 'undefined') {
    return null;
  }
  try {
    const fetchUrl = normalizeUrl(targetUrl);
    const parsed = new URL(targetUrl);
    const { blogId, logNo } = extractNaverBlogInfo(parsed);
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      if (blogId) {
        const rssFallback = await fetchFromNaverRSS(blogId, logNo);
        if (rssFallback) return rssFallback;
      }
      return createPlaceholderContent(targetUrl);
    }

    const html = await response.text();
    const title = extractTitle(html);
    const description = extractDescription(html);
    const content = extractMainContent(html);

    if ((!content || content.length < 50) && blogId) {
      const fallback = await fetchFromNaverRSS(blogId, logNo);
      if (fallback) {
        return fallback;
      }
      return createPlaceholderContent(targetUrl);
    }

    return {
      title,
      description,
      content
    };
  } catch (error) {
    console.error('Failed to fetch page content:', error);
    try {
      const parsed = new URL(targetUrl);
      const { blogId, logNo } = extractNaverBlogInfo(parsed);
      if (blogId) {
        const fallback = await fetchFromNaverRSS(blogId, logNo);
        if (fallback) return fallback;
      }
    } catch {}
    return createPlaceholderContent(targetUrl);
  }
}
