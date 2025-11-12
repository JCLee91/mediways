# Mediways 블로그 쇼츠 생성 기능 통합 계획서

작성일: 2025-11-06
작성자: Claude AI Agent
목적: Mediways에 블로그 URL → YouTube 쇼츠 자동 변환 기능 추가

---

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [현재 상황 분석](#현재-상황-분석)
3. [통합 아키텍처](#통합-아키텍처)
4. [단계별 구현 계획](#단계별-구현-계획)
5. [기술 스택 통합 전략](#기술-스택-통합-전략)
6. [예상 비용 및 리스크](#예상-비용-및-리스크)

---

## 1. 프로젝트 개요

### 1.1 목표
메디웨이즈 플랫폼에 **네이버 블로그 URL 입력 → YouTube 쇼츠 자동 생성** 기능 추가

### 1.2 기능 요구사항
- ✅ 블로그 URL 입력 (네이버 블로그 전용)
- ✅ 자동 크롤링 및 콘텐츠 추출
- ✅ AI 요약 (블로그 글 → 쇼츠 스크립트)
- ✅ 영상 생성 (kie.ai Veo3 API)
- ✅ 자막 생성 및 오버레이 (FFmpeg)
- ✅ 의료법 준수 자동 검수 (기존 메디웨이즈 기능 활용)
- ✅ 다운로드 및 공유

### 1.3 기대 효과
- 의료기관이 기존 블로그 콘텐츠를 쇼츠로 재활용
- 콘텐츠 제작 시간 90% 단축
- SEO 최적화 + 쇼츠 마케팅 동시 제공
- 법적 리스크 제로 (의료법 자동 검수)

---

## 2. 현재 상황 분석

### 2.1 메디웨이즈 (mediways_Ver2) 현황

#### 기술 스택
- **Framework**: Next.js 15.3.2 (App Router)
- **Language**: TypeScript 5.8.3
- **Database**: Supabase PostgreSQL
- **AI**: OpenAI GPT-4o-mini
- **Package Manager**: pnpm

#### 주요 기능
1. 의료법 준수 검수 시스템
2. SEO 최적화 콘텐츠 생성
3. 4가지 콘텐츠 유형 (블로그, SNS, YouTube, 카피라이팅)
4. 30+ 진료과목 템플릿
5. Admin 대시보드

#### 폴더 구조
```
src/
├── app/
│   ├── (main)/          # 사용자 페이지
│   │   ├── blog/
│   │   ├── sns/
│   │   ├── youtube/
│   │   └── copywriting/
│   ├── admin/           # 관리자 페이지
│   └── api/             # API Routes
├── lib/
│   ├── prompts/         # AI 프롬프트
│   ├── services/        # 비즈니스 로직
│   └── supabase/        # DB 클라이언트
└── types/               # TypeScript 타입
```

### 2.2 블로그쇼츠 (blogshorts) 현황

#### 기술 스택
- **Framework**: Next.js 15.1.0 (App Router)
- **Language**: TypeScript
- **Backend**: Hono.js (경량 웹 프레임워크)
- **Database**: Supabase
- **AI**: OpenAI GPT-4
- **Video**: kie.ai Veo3 API
- **Package Manager**: npm

#### 주요 기능
1. 네이버 블로그 크롤링 (Cheerio)
2. AI 요약 (OpenAI GPT-4)
3. 영상 생성 (kie.ai Veo3)
4. 자막 생성 (FFmpeg)
5. 멀티 클립 변환

#### 폴더 구조 (Feature-based)
```
src/
├── features/
│   ├── crawl/           # 크롤링 기능
│   │   └── backend/
│   │       ├── service.ts
│   │       ├── route.ts
│   │       └── schema.ts
│   ├── summarize/       # 요약 기능
│   │   └── backend/
│   ├── video/           # 영상 생성
│   │   └── backend/
│   └── convert/         # 변환 통합
├── backend/             # 공통 백엔드 로직
│   ├── hono/
│   └── supabase/
└── app/
```

### 2.3 주요 차이점

| 항목 | Mediways | Blogshorts |
|------|----------|------------|
| **아키텍처** | Next.js API Routes | Hono.js + Next.js |
| **패키지 매니저** | pnpm | npm |
| **폴더 구조** | 기능별 분산 | Feature-based 모듈화 |
| **DB 스키마** | generations, rate_limits | conversion_jobs |
| **AI 모델** | GPT-4o-mini (의료 특화) | GPT-4 (일반) |
| **특화 기능** | 의료법 검수 | 블로그 크롤링 + 영상 |

---

## 3. 통합 아키텍처

### 3.1 통합 전략

#### Option A: Feature 모듈 임베딩 (권장)
블로그쇼츠의 feature 모듈을 메디웨이즈에 그대로 이식

**장점:**
- 기존 코드 재사용률 높음
- 독립적인 모듈로 관리 용이
- 빠른 구현 (2-3주)

**단점:**
- 아키텍처 일관성 약간 저하
- Hono.js 제거 필요

#### Option B: 완전 재설계
메디웨이즈 스타일로 모든 로직 재작성

**장점:**
- 아키텍처 통일
- 코드 일관성 유지

**단점:**
- 개발 기간 증가 (4-6주)
- 버그 리스크 증가

### 3.2 선택된 전략: **Option A (Feature 모듈 임베딩)**

---

## 4. 단계별 구현 계획

### Phase 1: 환경 설정 및 의존성 통합 (1일)

#### Task 1.1: 패키지 설치
```bash
cd /Users/jclee/Desktop/휠즈랩스/외주 프로젝트/mediways_Ver2

# Blogshorts 의존성 추가
pnpm add cheerio axios fluent-ffmpeg @ffmpeg-installer/ffmpeg ffprobe-static
pnpm add -D @types/fluent-ffmpeg
```

#### Task 1.2: 환경 변수 추가
`.env.local`에 추가:
```env
# 기존 변수들...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...

# 새로 추가
KIE_AI_API_KEY=your_kie_ai_api_key_here
```

#### Task 1.3: FFmpeg 설치 확인
서버 환경에 FFmpeg 설치 필요 (Vercel의 경우 Docker 컨테이너 고려)

---

### Phase 2: 데이터베이스 스키마 추가 (1일)

#### Task 2.1: Supabase 마이그레이션 생성
`supabase/migrations/015_create_shorts_conversion_table.sql`:

```sql
-- 쇼츠 변환 작업 테이블
CREATE TABLE shorts_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 입력
  blog_url TEXT NOT NULL,
  blog_title TEXT,
  blog_content TEXT,
  blog_images TEXT[],

  -- 처리 상태
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, crawling, summarizing, generating_video, adding_subtitles, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  current_step TEXT,

  -- AI 요약 결과
  summary TEXT,
  segments JSONB, -- [{title, content, order, videoPrompt}]

  -- 영상 생성
  kie_task_id TEXT,
  raw_video_url TEXT,
  final_video_url TEXT, -- 자막 포함 최종 영상
  video_duration INTEGER, -- 초

  -- 메타데이터
  error_message TEXT,
  generation_logs JSONB[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_shorts_conversions_user_id ON shorts_conversions(user_id);
CREATE INDEX idx_shorts_conversions_status ON shorts_conversions(status);
CREATE INDEX idx_shorts_conversions_created_at ON shorts_conversions(created_at DESC);

-- RLS 정책
ALTER TABLE shorts_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversions"
  ON shorts_conversions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversions"
  ON shorts_conversions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversions"
  ON shorts_conversions FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### Phase 3: Feature 모듈 이식 (3-4일)

#### Task 3.1: 크롤링 서비스 이식
`src/lib/services/blogCrawler.ts` 생성:

```typescript
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

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
    const iframeResponse = await axios.get(`https://blog.naver.com${iframeSrc}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const iframe$ = cheerio.load(iframeResponse.data);

    // 제목 추출
    const title = iframe$('.se-title-text').text().trim() ||
                  iframe$('.pcol1').text().trim() ||
                  '제목 없음';

    // 본문 추출
    const contentParagraphs = iframe$('.se-main-container .se-text-paragraph')
      .map((_, el) => iframe$(el).text().trim())
      .get();

    const content = contentParagraphs.join('\n\n').slice(0, 10000);

    // 이미지 추출
    const images = iframe$('.se-main-container img')
      .map((_, el) => iframe$(el).attr('src') || iframe$(el).attr('data-lazy-src'))
      .get()
      .filter(Boolean)
      .slice(0, 10);

    return {
      title,
      content,
      images,
    };
  }
}
```

#### Task 3.2: 쇼츠 요약 서비스 생성
`src/lib/services/shortsScriptGenerator.ts`:

```typescript
import OpenAI from 'openai';

interface ShortSegment {
  title: string;
  content: string;
  order: number;
  videoPrompt: string;
}

interface ShortsScript {
  summary: string;
  segments: ShortSegment[];
  totalDuration: number;
}

export class ShortsScriptGeneratorService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateScript(title: string, content: string): Promise<ShortsScript> {
    const prompt = `다음은 의료 관련 블로그 글입니다. 이 글을 24-32초 YouTube 쇼츠 영상(8초 클립 3-4개)에 적합하게 구성해주세요.

의료법 준수 주의사항:
- 확정적 효과 표현 금지 (100%, 완치 등)
- 환자 후기/사례 금지
- 가격 언급 금지
- 과장된 표현 자제

제목: ${title}

본문:
${content.slice(0, 8000)}

요구사항:
1. 전체 요약: 3-5문장으로 핵심 내용만 간결하게 요약
2. 영상 세그먼트: 3-4개의 8초 클립 구성
   - 각 세그먼트는 독립적인 장면
   - 스토리: 시작(문제/흥미) → 중간(전개/설명) → 끝(해결/결론)
3. videoPrompt: 각 클립의 영상 생성용 프롬프트 (영어, 의료 이미지 묘사)

응답 형식 (JSON):
{
  "summary": "전체 요약",
  "segments": [
    {
      "title": "오프닝 - 문제 제시",
      "content": "첫 번째 클립 내용",
      "order": 0,
      "videoPrompt": "A medical clinic waiting room, patients sitting..."
    }
  ],
  "totalDuration": 24
}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini', // 메디웨이즈 기존 모델 사용
      messages: [
        { role: 'system', content: '당신은 의료 콘텐츠를 YouTube 쇼츠로 변환하는 전문가입니다.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    return result as ShortsScript;
  }
}
```

#### Task 3.3: kie.ai 영상 생성 서비스
`src/lib/services/kieAiVideoGenerator.ts`:

```typescript
import axios from 'axios';

interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9';
  duration: number;
}

interface VideoGenerationResult {
  taskId: string;
  videoUrl: string;
  duration: number;
}

export class KieAiVideoGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.kie.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/veo/generate`,
      {
        prompt: request.prompt,
        model: 'veo3_fast',
        aspect_ratio: request.aspectRatio,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const { taskId } = response.data;
    return taskId;
  }

  async pollTaskStatus(taskId: string, maxAttempts = 60): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기

      const response = await axios.get(
        `${this.baseUrl}/veo/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const { status, videoUrl, error } = response.data;

      if (status === 'completed' && videoUrl) {
        return videoUrl;
      }

      if (status === 'failed') {
        throw new Error(`영상 생성 실패: ${error}`);
      }

      // pending, processing 상태면 계속 대기
    }

    throw new Error('영상 생성 타임아웃 (최대 5분)');
  }
}
```

#### Task 3.4: FFmpeg 자막 서비스
`src/lib/services/subtitleProcessor.ts`:

```typescript
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

interface SubtitleSegment {
  text: string;
  start: number; // 초
  end: number;
}

export class SubtitleProcessorService {
  static generateSRT(segments: SubtitleSegment[]): string {
    let srtContent = '';

    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    });

    return srtContent;
  }

  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  static async addSubtitlesToVideo(
    videoPath: string,
    srtPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf subtitles=${srtPath}:force_style='FontName=NanumGothic,Fontsize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=1,Outline=2,Shadow=1,MarginV=20'`,
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }
}
```

---

### Phase 4: API 엔드포인트 개발 (2-3일)

#### Task 4.1: 쇼츠 변환 API
`src/app/api/shorts/convert/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlogCrawlerService } from '@/lib/services/blogCrawler';
import { ShortsScriptGeneratorService } from '@/lib/services/shortsScriptGenerator';
import { KieAiVideoGeneratorService } from '@/lib/services/kieAiVideoGenerator';

export const runtime = 'nodejs'; // FFmpeg 사용을 위해 Node.js 런타임 필요

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blogUrl } = await request.json();

    // URL 검증
    if (!BlogCrawlerService.isNaverBlogUrl(blogUrl)) {
      return NextResponse.json(
        { error: '올바른 네이버 블로그 URL을 입력해주세요.' },
        { status: 400 }
      );
    }

    // DB에 작업 생성
    const { data: conversion, error } = await supabase
      .from('shorts_conversions')
      .insert({
        user_id: user.id,
        blog_url: blogUrl,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 백그라운드 작업 시작 (별도 함수로 분리)
    processConversion(conversion.id, blogUrl);

    return NextResponse.json({
      jobId: conversion.id,
      status: 'pending',
      message: '쇼츠 변환 작업이 시작되었습니다.',
    });

  } catch (error: any) {
    console.error('Shorts conversion error:', error);
    return NextResponse.json(
      { error: error.message || '쇼츠 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function processConversion(conversionId: string, blogUrl: string) {
  const supabase = await createClient();

  try {
    // 1. 크롤링 (20%)
    await updateProgress(conversionId, 'crawling', 10);
    const crawlResult = await BlogCrawlerService.crawlNaverBlog(blogUrl);

    await supabase
      .from('shorts_conversions')
      .update({
        blog_title: crawlResult.title,
        blog_content: crawlResult.content,
        blog_images: crawlResult.images,
      })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'crawling', 20);

    // 2. AI 요약 (40%)
    await updateProgress(conversionId, 'summarizing', 25);
    const scriptGenerator = new ShortsScriptGeneratorService(
      process.env.OPENAI_API_KEY!
    );
    const script = await scriptGenerator.generateScript(
      crawlResult.title,
      crawlResult.content
    );

    await supabase
      .from('shorts_conversions')
      .update({
        summary: script.summary,
        segments: script.segments,
      })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'summarizing', 40);

    // 3. 영상 생성 (80%)
    await updateProgress(conversionId, 'generating_video', 45);
    const videoGenerator = new KieAiVideoGeneratorService(
      process.env.KIE_AI_API_KEY!
    );

    // 첫 번째 세그먼트로 영상 생성 (MVP)
    const firstSegment = script.segments[0];
    const taskId = await videoGenerator.generateVideo({
      prompt: firstSegment.videoPrompt,
      aspectRatio: '9:16',
      duration: 8,
    });

    await supabase
      .from('shorts_conversions')
      .update({ kie_task_id: taskId })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'generating_video', 60);

    const rawVideoUrl = await videoGenerator.pollTaskStatus(taskId);

    await supabase
      .from('shorts_conversions')
      .update({ raw_video_url: rawVideoUrl })
      .eq('id', conversionId);

    await updateProgress(conversionId, 'generating_video', 80);

    // 4. 자막 추가 (95%)
    // TODO: FFmpeg로 자막 오버레이
    // 현재는 원본 영상 그대로 사용 (Phase 5에서 구현)
    await updateProgress(conversionId, 'adding_subtitles', 90);

    await supabase
      .from('shorts_conversions')
      .update({
        final_video_url: rawVideoUrl, // 임시로 원본 영상 사용
        video_duration: 8,
      })
      .eq('id', conversionId);

    // 5. 완료 (100%)
    await updateProgress(conversionId, 'completed', 100);

    await supabase
      .from('shorts_conversions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', conversionId);

  } catch (error: any) {
    console.error('Processing error:', error);
    await supabase
      .from('shorts_conversions')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', conversionId);
  }
}

async function updateProgress(
  conversionId: string,
  status: string,
  progress: number
) {
  const supabase = await createClient();
  await supabase
    .from('shorts_conversions')
    .update({
      status,
      progress,
      current_step: getStepMessage(status),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversionId);
}

function getStepMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: '대기 중...',
    crawling: '블로그 콘텐츠를 가져오는 중...',
    summarizing: 'AI가 스크립트를 작성하는 중...',
    generating_video: '영상을 생성하는 중... (약 2-3분 소요)',
    adding_subtitles: '자막을 추가하는 중...',
    completed: '완료!',
    failed: '오류 발생',
  };
  return messages[status] || status;
}
```

#### Task 4.2: 상태 조회 API
`src/app/api/shorts/status/[jobId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversion, error } = await supabase
      .from('shorts_conversions')
      .select('*')
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversion) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: conversion.id,
      status: conversion.status,
      progress: conversion.progress,
      currentStep: conversion.current_step,
      result: conversion.status === 'completed' ? {
        videoUrl: conversion.final_video_url,
        duration: conversion.video_duration,
        title: conversion.blog_title,
        summary: conversion.summary,
      } : null,
      error: conversion.error_message,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

---

### Phase 5: 프론트엔드 개발 (2-3일)

#### Task 5.1: 쇼츠 생성 페이지
`src/app/(main)/shorts/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function ShortsPage() {
  const [blogUrl, setBlogUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/shorts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setJobId(data.jobId);
      startPolling(data.jobId);

      toast({
        title: '쇼츠 생성 시작',
        description: '영상이 생성될 때까지 2-3분 정도 소요됩니다.',
      });

    } catch (error: any) {
      toast({
        title: '오류 발생',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/shorts/status/${jobId}`);
      const data = await response.json();

      setStatus(data);

      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 3000); // 3초마다 폴링
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">블로그 쇼츠 생성</h1>

      <Card className="p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              네이버 블로그 URL
            </label>
            <Input
              type="url"
              placeholder="https://blog.naver.com/아이디/12345678"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground mt-2">
              의료 관련 블로그 글을 입력하시면 자동으로 쇼츠 영상을 생성합니다.
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? '생성 중...' : '쇼츠 생성하기'}
          </Button>
        </form>
      </Card>

      {status && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">진행 상황</h3>

          <Progress value={status.progress} className="mb-4" />

          <p className="text-sm text-muted-foreground mb-4">
            {status.currentStep}
          </p>

          {status.status === 'completed' && status.result && (
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">생성된 영상</h4>
                <video
                  src={status.result.videoUrl}
                  controls
                  className="w-full rounded-lg"
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">제목</h4>
                <p>{status.result.title}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">요약</h4>
                <p className="text-sm text-muted-foreground">
                  {status.result.summary}
                </p>
              </div>

              <Button
                onClick={() => window.open(status.result.videoUrl, '_blank')}
                className="w-full"
              >
                다운로드
              </Button>
            </div>
          )}

          {status.status === 'failed' && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              오류: {status.error}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
```

#### Task 5.2: 사이드바에 메뉴 추가
`src/app/Sidebar.tsx` 수정:

```typescript
// 기존 메뉴에 추가
const menuItems = [
  // ... 기존 메뉴들
  {
    href: '/shorts',
    icon: Video,
    label: '블로그 쇼츠',
    description: '블로그를 쇼츠 영상으로 변환',
  },
];
```

---

### Phase 6: 의료법 검수 통합 (1일)

#### Task 6.1: 크롤링 후 의료법 검수
`src/lib/services/blogCrawler.ts` 수정:

```typescript
import { medicalComplianceChecker } from '@/lib/services/medicalComplianceChecker';

export class BlogCrawlerService {
  static async crawlAndCheckCompliance(url: string) {
    const crawlResult = await this.crawlNaverBlog(url);

    // 의료법 검수
    const complianceCheck = medicalComplianceChecker.checkContent(
      crawlResult.content
    );

    if (complianceCheck.hasViolations) {
      throw new Error(
        `의료법 위반 감지: ${complianceCheck.violations.map(v => v.issue).join(', ')}`
      );
    }

    return crawlResult;
  }
}
```

---

### Phase 7: 테스트 및 배포 (2일)

#### Task 7.1: 통합 테스트
- [ ] 전체 플로우 엔드투엔드 테스트
- [ ] 다양한 블로그 URL 테스트
- [ ] 에러 케이스 테스트
- [ ] 의료법 검수 테스트

#### Task 7.2: 성능 최적화
- [ ] 타임아웃 설정
- [ ] 에러 핸들링 강화
- [ ] 로깅 시스템 구축

#### Task 7.3: 배포
- [ ] Vercel 환경 변수 설정
- [ ] FFmpeg Docker 컨테이너 설정 (필요시)
- [ ] 프로덕션 배포

---

## 5. 기술 스택 통합 전략

### 5.1 패키지 매니저 통합
- **선택**: pnpm (메디웨이즈 기존 방식 유지)
- **이유**: 일관성 유지, 더 빠른 설치 속도

### 5.2 아키텍처 통합
- **Hono.js 제거**: Next.js API Routes만 사용
- **Feature 모듈**: `src/lib/services/` 아래에 배치
- **이유**: 메디웨이즈의 기존 구조 유지

### 5.3 데이터베이스 통합
- **기존 Supabase 활용**
- **새 테이블 추가**: `shorts_conversions`
- **RLS 정책 통일**

### 5.4 AI 모델 통합
- **OpenAI**: GPT-4o-mini (비용 절감)
- **의료법 검수**: 기존 메디웨이즈 시스템 활용
- **프롬프트**: 의료 콘텐츠 특화

---

## 6. 예상 비용 및 리스크

### 6.1 추가 비용 (영상 1개당)
| 항목 | 단가 | 비고 |
|------|------|------|
| kie.ai Veo3 | $0.64 | 8초 영상 기준 |
| OpenAI GPT-4o-mini | $0.01 | 요약 |
| Supabase Storage | $0.0001 | 20MB 영상 |
| **합계** | **$0.65** | |

**월 100개 생성 시**: ~$65

### 6.2 개발 기간
- **MVP (자막 없음)**: 2-3주
- **완전 프로덕션 (자막 포함)**: 4-5주

### 6.3 주요 리스크

#### 높음
1. **네이버 크롤링 차단**
   - 완화: User-Agent, 딜레이, 한국 IP
   - 대안: 사용자가 블로그 텍스트 직접 붙여넣기

2. **FFmpeg 서버리스 실행**
   - 완화: Docker 컨테이너 (Railway, Render)
   - 대안: 자막 없는 버전 먼저 출시

#### 중간
3. **kie.ai API 불안정**
   - 완화: Retry 로직, 타임아웃 설정
   - 대안: Runway API로 전환

4. **비용 증가**
   - 완화: 캐싱, 사용자당 일일 제한 (3개)
   - 대안: 프리미엄 요금제 도입

---

## 7. 다음 단계

### 즉시 시작 가능
1. ✅ **Phase 1 시작**: 패키지 설치 및 환경 설정
2. ✅ **Phase 2 시작**: DB 스키마 생성
3. ✅ **kie.ai API 키 발급**: https://kie.ai/api-key

### 구현 우선순위
1. **High Priority** (MVP)
   - 크롤링 (Phase 3.1)
   - AI 요약 (Phase 3.2)
   - 영상 생성 (Phase 3.3)
   - API 엔드포인트 (Phase 4)
   - 프론트엔드 (Phase 5)

2. **Medium Priority**
   - 의료법 검수 통합 (Phase 6)
   - 자막 생성 (Phase 3.4)

3. **Low Priority**
   - 고급 기능 (멀티 클립, 배경음악)
   - 성능 최적화

---

## 8. 결론

### 8.1 실현 가능성
✅ **매우 높음** - 블로그쇼츠 프로젝트의 검증된 코드 활용

### 8.2 차별화 포인트
- ✅ **의료법 100% 준수** (메디웨이즈 강점 활용)
- ✅ **원클릭 변환** (URL만 입력)
- ✅ **전문 의료 콘텐츠** (30+ 진료과목 최적화)

### 8.3 권장사항
1. **MVP 먼저 출시** (자막 없이, 2-3주)
2. **사용자 피드백 수집**
3. **점진적 기능 추가** (자막, 멀티 클립)
4. **비용 모니터링 필수**

---

**문서 버전**: 1.0
**작성일**: 2025-11-06
**다음 업데이트**: 구현 시작 후 실제 결과 반영
