/**
 * 쇼츠 생성 테스트 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/test-shorts-generation.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

// 테스트 URL
const TEST_URL = 'https://blog.naver.com/PostView.naver?blogId=skfl5780&logNo=224079014877&categoryNo=26';

async function testCrawling() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【1단계: 크롤링 테스트】');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`URL: ${TEST_URL}\n`);

  // 동적 import (ESM 호환)
  const { fetchPageContent } = await import('../src/lib/services/urlContentFetcher');

  const result = await fetchPageContent(TEST_URL);

  if (!result) {
    console.log('❌ 크롤링 실패: null 반환');
    return null;
  }

  console.log('📌 제목:', result.title);
  console.log('📌 설명:', result.description || '(없음)');
  console.log('📌 본문 길이:', result.content.length, '자');
  console.log('📌 본문 미리보기 (처음 500자):');
  console.log('---');
  console.log(result.content.slice(0, 500));
  console.log('---\n');

  return result;
}

async function testScriptGeneration(title: string, content: string) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【2단계: AI 스크립트 생성 테스트】');
  console.log('═══════════════════════════════════════════════════════════════');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    return null;
  }

  const { ShortsScriptGeneratorService } = await import('../src/lib/services/shortsScriptGenerator');

  const generator = new ShortsScriptGeneratorService(apiKey);

  console.log('\n⏳ AI 3단계 생성 중... (1-2분 소요)\n');

  try {
    const script = await generator.generateScript(
      title,
      content,
      async (stage) => {
        if (stage === 1) console.log('  → 2/3 단계: 대본 작성 중...');
        if (stage === 2) console.log('  → 3/3 단계: 영상 프롬프트 생성 중...');
      }
    );

    console.log('\n✅ 스크립트 생성 완료!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('【결과】');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📌 쇼츠 제목:', script.shortsTitle);
    console.log('📌 요약:', script.summary);
    console.log('📌 총 길이:', script.totalDuration, '초');

    console.log('\n--- 대본 ---');
    for (const seg of script.segments) {
      console.log(`\n[클립 ${seg.order + 1}] ${seg.title}`);
      console.log(`대본: ${seg.content}`);
      console.log(`영상 프롬프트: ${seg.videoPrompt.slice(0, 100)}...`);
    }

    return script;
  } catch (error: any) {
    console.log('❌ AI 생성 실패:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n🎬 쇼츠 생성 파이프라인 테스트\n');

  // 1. 크롤링 테스트
  const crawlResult = await testCrawling();

  if (!crawlResult || crawlResult.content.length < 100) {
    console.log('\n⚠️  크롤링된 콘텐츠가 너무 짧습니다!');
    console.log('   PostList URL이 아닌 개별 글 URL을 사용해야 합니다.');
    console.log('   예: https://blog.naver.com/skfl5780/223XXXXXXXXX');
    return;
  }

  // 2. AI 스크립트 생성 테스트
  await testScriptGeneration(crawlResult.title, crawlResult.content);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('테스트 완료');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
