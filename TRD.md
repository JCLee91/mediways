## 메디웨이즈 TRD (Technical Requirements Document)

### 1) 아키텍처
- Next.js 15(App Router) + TypeScript
- Supabase(Postgres + Auth + RLS)
- OpenAI SDK(스트리밍)
- 배포: Vercel

### 2) 환경 변수
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (서버 전용)
- OPENAI_API_KEY (프로덕션 필수, 개발은 모의 스트림)

### 3) 핵심 테이블/뷰/함수
- 테이블
  - `public.generations(id, user_id, type, sub_type, input_data, output_content, created_at)`
  - `public.api_requests(id, user_id, endpoint, created_at)`
- 정책
  - RLS: 사용자는 자신의 `generations`만 조회/삽입/삭제, 관리자는 모든 행 조회/삭제 허용
- 뷰
  - `public.generations_with_email`: `generations` ←→ `auth.users` 이메일 조인
- 함수
  - `public.count_distinct_generations_users(): integer`
  - `public.get_user_stats(search text, page int, page_size int)` → (user_id, email, total_generations, created_at, last_activity, total_count)

### 4) 라우트 핸들러(요약)
- `POST /api/generate`
  - 인증 필수. 프로덕션에서만 레이트 리밋 체크.
  - OpenAI 스트리밍(키 없으면 모의 스트리밍) → 완료 후 `generations`에 저장.
- `GET /api/admin/logs`
  - 인증 + 관리자 체크. `generations_with_email`에서 페이지네이션/카운트.
- `GET /api/admin/users`
  - 인증 + 관리자 체크. `rpc('get_user_stats')`로 집계/검색/페이징.
- `GET /api/admin/analytics`
  - 인증 + 관리자 체크. 기간 내 집계(차후 SQL 집계 전환 예정).
- `GET /api/admin/users/[userId]/details`
  - 인증 + 관리자 체크. 특정 유저의 최근 10개 `generations` 조회.

### 5) 인증/미들웨어
- Supabase Auth 세션을 미들웨어에서 확인하여 보호 라우트/어드민 라우트 접근 제어.

### 6) 성능/최적화 요구사항
- 어드민 리스트/대시보드: DB가 집계/조인 처리, 최소 컬럼만 선택, 추가 HTTP 호출 지양.
- 페이지네이션은 DB 레벨에서 처리, 총 개수는 필요 시에만 계산.
- 스트리밍 타임아웃 보호(30s 무활동) 및 에러 로깅.

### 7) 오류 처리/로깅
- 서비스/라우트에서 `APIError`로 의도적 오류 구분, 콘솔 에러 로깅.
- 개발 모드: 모의 스트림 데이터도 DB에 저장(테스트 관찰 가능).

### 8) 보안
- Service Role Key는 서버 사이드에서만 사용.
- 관리자 API는 `is_admin` 메타데이터로 이중 검증.
- 민감 데이터(키/토큰) 노출 금지, .env 버전관리 제외.

### 9) 배포/운영
- Vercel: `vercel pull --environment=production` 후 `vercel deploy --prod`.
- 마이그레이션: Supabase SQL Editor/CLI로 006 → 008 → 009 → 010 순서 적용.

### 10) 테스트(권장)
- 단위: 프롬프트 검증, `get_user_stats` 페이징/검색, 레이트 리밋.
- 통합: `/api/generate` 스트리밍, 생성 로그 저장.


