// 쇼츠 생성 전체 파이프라인 테스트 스크립트
// 실행: npx tsx scripts/test-shorts-full-flow.ts

import { BlogCrawlerService } from '../src/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '../src/lib/services/shortsScriptGenerator';
import * as dotenv from 'dotenv';
import path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testShortsFlow() {
  const targetUrl = 'https://blog.naver.com/qpsxmfsl/223918909532';
  console.log('🚀 테스트 시작: 쇼츠 생성 전체 플로우 점검');
  console.log(`🔗 대상 URL: ${targetUrl}\n`);

  try {
    // 1. 크롤링 테스트
    console.log('--- [Step 1] 블로그 크롤링 ---');
    const crawlResult = await BlogCrawlerService.crawlNaverBlog(targetUrl);
    
    console.log('✅ 크롤링 성공!');
    console.log(`📝 제목: ${crawlResult.title}`);
    console.log(`📄 본문 길이: ${crawlResult.content.length}자`);
    console.log(`📄 본문 미리보기: ${crawlResult.content.substring(0, 100)}...\n`);

    if (crawlResult.content.includes('본문을 찾지 못했습니다')) {
      console.warn('⚠️ 경고: 본문 추출 실패 (Fallback 메시지 감지됨)');
    }

    // 2. AI 기획 및 대본 생성 테스트
    console.log('--- [Step 2] AI 기획 및 대본 생성 ---');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. (.env.local 파일 확인 필요)');
    }

    const generator = new ShortsScriptGeneratorService(apiKey);
    
    // 진행 상황 로깅용 콜백
    const onProgress = async (stage: number) => {
      console.log(`[Progress] 단계 ${stage} 완료`);
    };

    const script = await generator.generateScript(
      crawlResult.title,
      crawlResult.content,
      onProgress
    );

    console.log('\n✅ AI 생성 완료!');
    console.log(`🎬 쇼츠 제목: ${script.shortsTitle}`);
    console.log(`📝 요약: ${script.summary}`);
    console.log(`⏱️ 총 예상 시간: ${script.totalDuration}초`);
    
    console.log('\n--- [Step 3] 생성된 세그먼트 확인 ---');
    script.segments.forEach((seg, idx) => {
      console.log(`\n[Segment ${idx + 1}] ${seg.title}`);
      console.log(`대본: "${seg.content}"`);
      console.log(`프롬프트: "${seg.videoPrompt.substring(0, 50)}..."`);
    });

  } catch (error: any) {
    console.error('\n❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('응답 데이터:', error.response.data);
    }
  }
}

testShortsFlow();
