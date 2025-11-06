// 블로그 분석 핵심 로직 구현
import Parser from 'rss-parser';
import { fetchPageContent } from '@/lib/services/urlContentFetcher';
import { TextAnalyzer } from '@/lib/services/textAnalyzer';
import { MedicalComplianceChecker } from '@/lib/services/medicalComplianceChecker';
import { blogAnalysisCache } from '@/lib/services/blogCache';
import {
  RSSFeed,
  RSSPost,
  SEOAnalysisResult,
  AnalyzedPost,
  BlogAnalysisResult,
  BlogAnalysisError,
  BLOG_ANALYSIS_CONSTANTS,
  validateBlogId,
  isValidRSSUrl
} from '@/types/blog-analysis';

export class BlogAnalyzer {
  private parser: Parser;
  private textAnalyzer: TextAnalyzer;
  private complianceChecker: MedicalComplianceChecker;
  
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['category', 'creator']
      },
      timeout: 10000, // 10초 타임아웃
    });
    this.textAnalyzer = new TextAnalyzer();
    this.complianceChecker = new MedicalComplianceChecker();
  }

  /**
   * 네이버 블로그 RSS 피드를 가져와서 파싱 + 실제 본문 크롤링
   */
  async fetchBlogRSS(blogId: string): Promise<RSSFeed> {
    validateBlogId(blogId);

    const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;

    if (!isValidRSSUrl(rssUrl)) {
      throw new BlogAnalysisError('올바르지 않은 RSS URL입니다', 400, 'INVALID_RSS_URL', blogId);
    }

    try {
      const feed = await this.parser.parseURL(rssUrl);

      if (!feed || !feed.items || feed.items.length === 0) {
        throw new BlogAnalysisError('블로그에 글이 없거나 RSS를 찾을 수 없습니다', 404, 'NO_POSTS_FOUND', blogId);
      }

      // RSS에서 URL 목록만 추출
      const rssItems = feed.items.slice(0, BLOG_ANALYSIS_CONSTANTS.MAX_POSTS_TO_ANALYZE);

      // 각 글의 실제 본문을 크롤링 (재시도 로직 포함)
      const posts: RSSPost[] = await Promise.all(
        rssItems.map(async (item) => {
          const url = item.link || '';
          let fullContent: string | null = null;
          let metaDescription: string | null = null;

          // 실제 페이지 본문 크롤링 (최대 2번 재시도)
          if (url) {
            let retries = 2;
            while (retries >= 0 && !fullContent) {
              try {
                const pageContent = await Promise.race([
                  fetchPageContent(url),
                  new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch timeout')), 8000)
                  )
                ]);

                if (pageContent && pageContent.content) {
                  fullContent = pageContent.content;
                  metaDescription = pageContent.description || null;
                }
                break; // 성공 시 재시도 중단
              } catch (error) {
                retries--;
                if (retries < 0) {
                  console.warn(`Failed to fetch full content after retries: ${url}`);
                }
                // 재시도 전 짧은 대기
                if (retries >= 0) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
          }

          return {
            title: item.title || '제목 없음',
            url,
            // 우선순위: 크롤링한 본문 > 메타설명 > RSS 요약
            description: fullContent || metaDescription || this.cleanDescription(item.contentSnippet || item.description || null),
            publishDate: new Date(item.pubDate || Date.now()),
            guid: item.guid
          };
        })
      );

      return {
        title: feed.title || `${blogId}의 블로그`,
        description: feed.description || '',
        posts,
        lastBuildDate: feed.lastBuildDate ? new Date(feed.lastBuildDate) : new Date()
      };
    } catch (error) {
      if (error instanceof BlogAnalysisError) {
        throw error;
      }

      // 네트워크 오류나 RSS 파싱 오류 처리
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new BlogAnalysisError('RSS 피드 요청 시간초과', 408, 'TIMEOUT', blogId);
        }
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          throw new BlogAnalysisError('블로그를 찾을 수 없습니다', 404, 'BLOG_NOT_FOUND', blogId);
        }
      }

      throw new BlogAnalysisError('RSS 피드를 가져오는 중 오류가 발생했습니다', 500, 'RSS_FETCH_ERROR', blogId);
    }
  }

  /**
   * 점수를 등급으로 변환
   */
  private getGrade(score: number): 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'needs_improvement';
    return 'poor';
  }

  /**
   * RSS 설명 텍스트 정리
   */
  private cleanDescription(description: string | null): string | null {
    if (!description) return null;
    
    // HTML 태그 제거
    const cleaned = description
      .replace(/<[^>]*>/g, ' ')
      .trim();
    
    return cleaned.length > 0 ? cleaned : null;
  }

  /**
   * 개별 글의 SEO 분석 - 실제 분석기 사용
   */
  analyzeSEO(post: RSSPost): SEOAnalysisResult {
    const startTime = Date.now();
    const fullContent = post.description || '';

    // 1. 제목 분석 (TextAnalyzer 사용)
    const titleAnalysis = this.textAnalyzer.analyzeTitle(post.title);

    // 2. 콘텐츠 텍스트 분석 (TextAnalyzer 사용)
    const contentAnalysis = this.textAnalyzer.analyze(fullContent);

    // 3. 가독성 분석 (TextAnalyzer 사용)
    const readabilityAnalysis = this.textAnalyzer.analyzeReadability(fullContent);

    // 4. 의료법 준수 검사 (MedicalComplianceChecker 사용)
    const complianceResult = this.complianceChecker.check(fullContent);

    // 5. 키워드 분석 (의료 관련 키워드 밀도)
    const medicalKeywords = BLOG_ANALYSIS_CONSTANTS.MEDICAL_KEYWORDS;
    const allKeywordResults = medicalKeywords
      .map(keyword => this.textAnalyzer.analyzeKeywordDensity(fullContent, keyword));

    // count > 0인 키워드만 상위 5개 표시용
    const keywordResults = allKeywordResults
      .filter(result => result.count > 0)
      .slice(0, 5);

    // 6. 메타 설명 분석 (description)
    const descriptionAnalysis = fullContent.length > 0
      ? this.textAnalyzer.analyzeDescription(fullContent.slice(0, 200)) // 첫 200자를 메타 설명으로 간주
      : { length: 0, isOptimal: false, score: 0, issues: ['메타 설명이 없습니다'], suggestions: [] };

    // 7. 점수 계산 (SEOScoreBreakdown 스케일에 맞춤)
    const titleScore = Math.min(20, (titleAnalysis.score / 40) * 20); // 40점 → 20점 스케일
    const readabilityScore = readabilityAnalysis.score; // 15점 만점 (그대로)
    const complianceScore = Math.min(30, complianceResult.complianceScore * 0.3); // 30점 만점
    const descriptionScore = Math.min(10, (descriptionAnalysis.score / 30) * 10); // 30점 → 10점 스케일

    // 키워드 점수: 최소 1개 이상 발견 시 점수 부여
    const foundKeywordsCount = allKeywordResults.filter(r => r.count > 0).length;
    const keywordScore = Math.min(10, (foundKeywordsCount / medicalKeywords.length) * 10); // 10점 만점

    // 콘텐츠 점수: 길이 기반
    const contentScore = Math.min(15, (contentAnalysis.charCount / 1000) * 15); // 1000자 기준 15점

    const overallScore = Math.round(
      Math.max(0, Math.min(100,
        titleScore + readabilityScore + complianceScore + descriptionScore + keywordScore + contentScore
      ))
    );

    // 8. 전체 issues 및 suggestions 수집
    const allIssues = [
      ...titleAnalysis.issues,
      ...descriptionAnalysis.issues,
      ...readabilityAnalysis.issues,
      ...complianceResult.violations.map(v => `의료법 위반: ${v}`)
    ];

    // 키워드 없는 경우 issues 추가
    allKeywordResults.forEach(kw => {
      if (kw.issues && kw.issues.length > 0) {
        allIssues.push(...kw.issues);
      }
    });

    const allSuggestions = [
      ...titleAnalysis.suggestions,
      ...descriptionAnalysis.suggestions,
      ...complianceResult.suggestions
    ];

    // 콘텐츠 길이 체크
    if (contentAnalysis.charCount < 300) {
      allIssues.push('콘텐츠 길이가 너무 짧습니다');
      allSuggestions.push('최소 300자 이상의 콘텐츠를 작성하세요');
    }

    return {
      analysisId: `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: post.url,
      overallScore,
      grade: this.getGrade(overallScore),
      // 스케일링된 점수를 포함한 분석 결과
      title: {
        ...titleAnalysis,
        score: titleScore  // 20점 만점으로 변환된 점수
      },
      content: contentAnalysis,
      description: {
        ...descriptionAnalysis,
        score: descriptionScore  // 10점 만점으로 변환된 점수
      },
      keywords: keywordResults, // 화면 표시용 (count > 0만)
      readability: readabilityAnalysis,
      compliance: complianceResult,
      scoreBreakdown: {
        title: titleScore,        // 20점 만점
        content: contentScore,     // 15점 만점
        description: descriptionScore, // 10점 만점
        keywords: keywordScore,    // 10점 만점
        readability: readabilityScore, // 15점 만점
        compliance: complianceScore    // 30점 만점
      },
      suggestions: allSuggestions,
      analyzedAt: new Date(),
      processingTime: Date.now() - startTime
    };
  }


  /**
   * 블로그 전체 분석 (캐시 적용)
   */
  async analyzeBlog(blogId: string, forceRefresh = false): Promise<BlogAnalysisResult> {
    const cacheKey = `blog_analysis:${blogId}`;

    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const cached = blogAnalysisCache.get(cacheKey) as BlogAnalysisResult | null;
      if (cached) {
        console.log(`[Cache Hit] Blog analysis for ${blogId}`);
        return cached;
      }
    }

    console.log(`[Cache Miss] Fetching and analyzing blog ${blogId}`);

    // 실제 분석 수행
    const feed = await this.fetchBlogRSS(blogId);

    // 각 글 분석
    const analyzedPosts: AnalyzedPost[] = feed.posts.map(post => ({
      ...post,
      seoAnalysis: this.analyzeSEO(post)
    }));

    // 통계 계산
    const quickStats = this.calculateQuickStats(feed, analyzedPosts);

    // 요약 생성
    const summary = this.generateSummary(analyzedPosts);

    const result: BlogAnalysisResult = {
      blogInfo: {
        blogId,
        title: feed.title,
        description: feed.description,
        totalPosts: feed.posts.length,
        lastUpdated: new Date(),
        rssUrl: `https://rss.blog.naver.com/${blogId}.xml`
      },
      quickStats,
      recentPosts: analyzedPosts,
      summary
    };

    // 캐시 저장 (6시간)
    blogAnalysisCache.set(cacheKey, result);

    return result;
  }

  /**
   * 빠른 통계 계산
   */
  private calculateQuickStats(feed: RSSFeed, analyzedPosts: AnalyzedPost[]) {
    const totalPosts = analyzedPosts.length;
    
    // 평균 제목 길이
    const averageTitleLength = Math.round(
      analyzedPosts.reduce((sum, post) => sum + post.title.length, 0) / totalPosts
    );
    
    // 설명 없는 글 수
    const postsWithoutDescription = analyzedPosts.filter(
      post => !post.description || post.description.length < 30
    ).length;
    
    // 최근 30일 내 글 수
    const thirtyDaysAgo = new Date(Date.now() - BLOG_ANALYSIS_CONSTANTS.RECENT_POSTS_DAYS * 24 * 60 * 60 * 1000);
    const recentPostsCount = analyzedPosts.filter(
      post => post.publishDate > thirtyDaysAgo
    ).length;
    
    // 전체 SEO 점수 평균
    const overallHealthScore = Math.round(
      analyzedPosts.reduce((sum, post) => sum + post.seoAnalysis.overallScore, 0) / totalPosts
    );
    
    // 활동도 점수 (최근 글 비율)
    const activityScore = Math.round((recentPostsCount / totalPosts) * 100);

    return {
      averageTitleLength,
      postsWithoutDescription,
      recentPostsCount,
      overallHealthScore,
      activityScore
    };
  }

  /**
   * 분석 요약 생성
   */
  private generateSummary(analyzedPosts: AnalyzedPost[]) {
    const allIssues = analyzedPosts.flatMap(post => post.seoAnalysis.suggestions);
    const allSuggestions = analyzedPosts.flatMap(post => post.seoAnalysis.suggestions);
    
    // 빈도수 기준으로 상위 이슈 추출
    const issueFreq: { [key: string]: number } = {};
    allIssues.forEach(issue => {
      issueFreq[issue] = (issueFreq[issue] || 0) + 1;
    });
    
    const topIssues = Object.entries(issueFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([issue]) => issue);
    
    // 상위 제안사항 추출
    const suggestionFreq: { [key: string]: number } = {};
    allSuggestions.forEach(suggestion => {
      suggestionFreq[suggestion] = (suggestionFreq[suggestion] || 0) + 1;
    });
    
    const recommendations = Object.entries(suggestionFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([suggestion]) => suggestion);
    
    // 강점 영역 파악
    const highScorePosts = analyzedPosts.filter(post => post.seoAnalysis.overallScore >= 80);
    const strengthAreas: string[] = [];

    if (highScorePosts.length > analyzedPosts.length * 0.5) {
      strengthAreas.push('전반적으로 좋은 SEO 점수를 유지하고 있습니다');
    }

    // 제목 점수 (20점 만점 기준)
    const avgTitleScore = analyzedPosts.reduce((sum, post) => sum + post.seoAnalysis.scoreBreakdown.title, 0) / analyzedPosts.length;
    if (avgTitleScore >= 15) {
      strengthAreas.push('제목 최적화가 잘 되어 있습니다');
    }

    // 메타 설명 점수 (10점 만점 기준)
    const postsWithGoodDescription = analyzedPosts.filter(post => post.seoAnalysis.scoreBreakdown.description >= 7).length;
    if (postsWithGoodDescription > analyzedPosts.length * 0.7) {
      strengthAreas.push('글 설명이 충실합니다');
    }

    // 의료법 준수도 (30점 만점 기준)
    const avgComplianceScore = analyzedPosts.reduce((sum, post) => sum + post.seoAnalysis.scoreBreakdown.compliance, 0) / analyzedPosts.length;
    if (avgComplianceScore >= 25) {
      strengthAreas.push('의료법 준수도가 높습니다');
    }

    return {
      topIssues,
      recommendations,
      strengthAreas: strengthAreas.length > 0 ? strengthAreas : ['개선 영역이 많아 더 나은 SEO를 위한 노력이 필요합니다']
    };
  }
}

