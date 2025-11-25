// require('dotenv').config({ path: '.env.local' });
// const { createClient } = require('@supabase/supabase-js');

// 실제 환경과 동일하게 맞추기 위해 BlogCrawlerService 로직을 가져와 테스트
// TypeScript 모듈을 직접 import하는 대신 로직을 복사해서 테스트합니다 (Node.js 실행을 위해)

async function testCrawl() {
  const blogUrl = 'https://blog.naver.com/esthetia1208/224045640459';
  console.log(`Testing crawler for: ${blogUrl}`);

  try {
    const axios = require('axios');
    const cheerio = require('cheerio');
    const iconv = require('iconv-lite');

    // 모바일 URL 변환 로직
    const mobileUrl = blogUrl.replace('blog.naver.com', 'm.blog.naver.com');
    console.log(`Mobile URL: ${mobileUrl}`);

    const response = await axios.get(mobileUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });

    const content = iconv.decode(response.data, 'utf-8');
    const $ = cheerio.load(content);

    // 제목 추출
    const title = $('.se-fs-').text() || 
                  $('.se_title .se_textarea').text() || 
                  $('.se-title-text').text() || 
                  $('h3.se_textarea').text();

    // 본문 추출
    let mainContent = '';
    $('.se-main-container, .se_component_wrap, #viewTypeSelector').find('p, span, div.se-module-text').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5) {
        mainContent += text + '\n';
      }
    });

    // 이미지 추출
    const images = [];
    $('img.se-image-resource, .se_mediaImage').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('sticker') && !src.includes('profile')) {
        images.push(src);
      }
    });

    console.log('---------------------------------------------------');
    console.log('✅ Crawling Result:');
    console.log(`Title: ${title.trim()}`);
    console.log(`Content Length: ${mainContent.length} characters`);
    console.log(`Images Found: ${images.length}`);
    console.log('---------------------------------------------------');
    console.log('Preview (First 200 chars):');
    console.log(mainContent.substring(0, 200));
    console.log('---------------------------------------------------');

  } catch (error) {
    console.error('❌ Crawling Failed:', error.message);
  }
}

testCrawl();
