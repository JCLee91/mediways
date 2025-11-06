# Mediways - AI 의료광고 콘텐츠 생성 플랫폼

<div align="center">
  <img src="/public/favicon.png" alt="Mediways Logo" width="120" />
  
  **안전한 의료광고 콘텐츠를 AI와 함께**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-Private-red)](LICENSE)
</div>

## 📌 소개

Mediways는 대한민국 의료법을 준수하는 안전한 의료광고 콘텐츠를 자동으로 생성하는 AI 플랫폼입니다. 
의료기관이 법적 리스크 없이 효과적인 마케팅 콘텐츠를 제작할 수 있도록 지원합니다.

### ✨ 주요 기능

- **🏥 의료법 준수**: 의료법 제56조 및 시행령 제23조 자동 준수
- **📝 다양한 콘텐츠**: 블로그, SNS, YouTube 스크립트, 카피라이팅
- **🤖 AI 최적화**: GPT-4 기반 맞춤형 콘텐츠 생성
- **🎯 키워드별 최적화**: 시술/질환별 톤과 스타일 자동 조정   $
- **🔍 SEO 최적화**: 검색엔진 최적화된 콘텐츠 구조

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0 이상
- pnpm 8.0.0 이상 (권장)
- Supabase 계정
- OpenAI API 키

### 설치

```bash
# 저장소 클론
git clone https://github.com/JCLee91/mediways.git
cd mediways

# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 필요한 값들을 입력하세요
```

### 환경변수 설정

`.env.local` 파일에 다음 값들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key
```

### 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.

### 게스트 샘플 모드

- 로그인 없이 `/` 또는 `/dashboard`에 접속하면 의료법 준수/SEO KPI가 포함된 **샘플 대시보드**가 노출됩니다.
- 실제 데이터는 로그인 후 프로필에서 블로그를 연결하면 확인할 수 있습니다.
- 콘텐츠 생성(`/blog`, `/sns`, `/youtube`, `/copywriting`)과 프로필 편집은 로그인 사용자 전용으로 유지됩니다.

## 📦 기술 스택

### Frontend
- **Framework**: Next.js 15.3.2 (App Router)
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Custom components with Radix UI
- **State Management**: React Hooks
- **Streaming**: Vercel AI SDK

### Backend
- **Runtime**: Edge Runtime
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Service**: OpenAI GPT-4o-mini
- **Rate Limiting**: Custom implementation

### DevOps
- **Hosting**: Vercel
- **Code Quality**: ESLint, TypeScript strict mode
- **Formatter**: Biome

## 🏗️ 프로젝트 구조

```
mediways/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (main)/       # 인증된 사용자 페이지
│   │   ├── admin/        # 관리자 대시보드
│   │   ├── api/          # API 라우트
│   │   └── login/        # 인증 페이지
│   ├── components/       # React 컴포넌트
│   ├── lib/             
│   │   ├── prompts/      # AI 프롬프트 템플릿
│   │   ├── services/     # 비즈니스 로직
│   │   └── supabase/     # DB 클라이언트
│   └── types/            # TypeScript 타입 정의
└── supabase/
    └── migrations/       # 데이터베이스 마이그레이션
```

## 🔄 업데이트 내역 (2025-08)

- DB 타입 체크 오탈자 수정: `generations.type`의 `copyrighting` → `copywriting`
- 어드민 성능 개선: 이메일 조인 REST 호출 제거, SQL 집계/페이지네이션 도입
  - `generations_with_email` 뷰 활용
  - 사용자 통계용 SQL 함수 `get_user_stats(search, page, page_size)` 추가
  - 고유 사용자 수 집계 함수 `count_distinct_generations_users()` 추가
- 레이트 리미터 신뢰성 개선: `created_at` 기반 재시도 시간 계산 및 정렬 도입
- 개발 모드 OpenAI 키 미설정 시 모의 스트리밍 정상 동작하도록 서비스 생성자 로직 개선

## 🗄️ Supabase 마이그레이션 적용 순서

아래 순서대로 SQL을 적용하세요(이미 적용된 것은 건너뜀):

1) `supabase/migrations/006_create_generations_with_email_view.sql` (뷰 생성)
2) `supabase/migrations/008_fix_generations_type_check.sql` (타입 체크 수정)
3) `supabase/migrations/009_count_distinct_generations_users.sql` (고유 사용자 수 함수)
4) `supabase/migrations/010_get_user_stats.sql` (사용자 통계/검색/페이지네이션 함수)

적용 후 어드민 페이지 초기 로딩 및 목록 전환 속도가 개선됩니다.

## ⚙️ 어드민 페이지 최적화 요약

- 대시보드(`src/app/admin/page.tsx`)
  - 최근 로그: `generations_with_email` 뷰에서 바로 조회(추가 REST 호출 제거)
  - 전체/오늘 생성 수: 카운트 전용 쿼리
  - 전체 사용자 수: `count_distinct_generations_users()` 이용
- 사용자 목록 API(`src/app/api/admin/users/route.ts`)
  - `get_user_stats(search, page, page_size)`로 DB에서 집계/검색/페이지네이션 처리
- 로그 목록 API(`src/app/api/admin/logs/route.ts`)
  - 뷰에서 바로 조회하고 카운트 전용 쿼리 사용

## 🔐 의료법 준수 시스템

### 자동 필터링 항목
- ❌ 치료 효과 보장 표현 (100%, 완치 등)
- ❌ 환자 후기 및 전후 사진
- ❌ 타 병원 비교/비방
- ❌ 가격 직접 명시
- ❌ 과장/허위 광고

### 필수 포함 문구
- ✅ 개인차 존재 안내
- ✅ 전문의 상담 필요성
- ✅ 부작용 가능성 언급
- ✅ 의료광고 심의필 표시

## 📊 콘텐츠 유형

### 1. 블로그
- **리뷰형**: 환자 경험 중심 스토리텔링
- **정보형**: 의학 정보 교육 콘텐츠

### 2. SNS
- 인스타그램 (해시태그 최적화)
- 페이스북 (스토리텔링)
- 틱톡/숏츠 (짧은 영상 스크립트)
- X(트위터) (간결한 정보)
- 쓰레드 (깊이 있는 내용)

### 3. YouTube
- 5-8분 길이 스크립트
- 의료진 관점 전문 정보
- 타임스탬프 포함

### 4. 카피라이팅
- 한국어/영어 지원
- 다양한 톤과 스타일

## 🔧 주요 명령어

```bash
# 개발
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버 실행

# 코드 품질
pnpm lint         # ESLint 검사
pnpm type-check   # TypeScript 타입 체크
pnpm format       # Biome 포맷팅
```

## 🚀 배포(Vercel)

프로젝트가 Vercel에 연결되어 있다는 전제입니다.

1) 로그인/프로젝트 링크

```
vercel whoami
vercel login
vercel link
```

2) 프로덕션 환경변수/설정 동기화

```
vercel pull --environment=production --yes
```

3) 프로덕션 배포

```
pnpm build   # 로컬 빌드 확인(권장)
vercel deploy --prod --yes
```

배포 후 경고(approve-builds 등)는 무시 가능하지만, 필요 시 승인 설정을 적용하세요.

## 🚨 보안 고려사항

- 모든 API 엔드포인트는 인증 필수
- Rate limiting으로 과도한 요청 방지
- 의료법 위반 콘텐츠 자동 필터링
- 민감 정보 로깅 금지
- Service Role Key는 서버 사이드에서만 사용

## 🧪 문제 해결 가이드

- 개발 모드 OpenAI 키 미설정
  - 개발 환경에서 `OPENAI_API_KEY`가 없으면 `/api/generate`가 모의 스트리밍으로 동작합니다. 프로덕션에서는 키가 반드시 필요합니다.
- 레이트 리밋 `Retry-After`가 이상할 때
  - DB의 `api_requests` 테이블에 레코드가 쌓이는지 확인하고, 서버 시간이 정확한지 점검하세요.
- 어드민 페이지가 느릴 때
  - 상단 마이그레이션(006/008/009/010) 적용 여부를 먼저 확인하세요.

## 📈 SEO 최적화

### 플랫폼 SEO
- Open Graph 메타 태그
- Twitter Card 지원
- 구조화된 데이터
- Sitemap 자동 생성
- Robots.txt 설정

### 콘텐츠 SEO
- 키워드 최적화
- 제목 태그 계층 구조
- 해시태그 자동 생성
- 지역 SEO 지원

## 🤝 기여하기

이 프로젝트는 현재 비공개 저장소입니다. 기여를 원하시면 메인테이너에게 문의해주세요.

## 📄 라이선스

This is a proprietary software. All rights reserved.

## 📞 문의

- Email: mediways.dev@gmail.com
- Website: [https://mediways.ai](https://mediways.ai)

---

<div align="center">
  Made with ❤️ by Mediways Team
  
  **안전한 의료광고, AI와 함께**
</div>
