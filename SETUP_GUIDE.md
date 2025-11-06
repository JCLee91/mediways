# 🚀 Mediways 설치 및 설정 가이드

이 문서는 Mediways 프로젝트를 처음 설정하는 클라이언트를 위한 단계별 가이드입니다.

## 📋 사전 준비사항

### 1. 필수 소프트웨어 설치
- **Node.js** (18.0.0 이상): https://nodejs.org/
- **pnpm**: `npm install -g pnpm`
- **Git**: https://git-scm.com/

### 2. 필요한 계정들
- **GitHub** 계정 (프로젝트 다운로드용)
- **Supabase** 계정 (데이터베이스)
- **OpenAI** 계정 (AI API)
- **Vercel** 계정 (배포용, 선택사항)

## 🛠️ 설치 과정

### Step 1: 프로젝트 다운로드
```bash
git clone https://github.com/JCLee91/mediways.git
cd mediways
```

### Step 2: 의존성 설치
```bash
pnpm install
```

### Step 3: 환경변수 설정
```bash
cp .env.local.example .env.local
```

그 다음 `.env.local` 파일을 열어서 다음 값들을 입력하세요:

#### Supabase 설정
1. https://app.supabase.com/ 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. Settings → API → Project URL 복사하여 `NEXT_PUBLIC_SUPABASE_URL`에 입력
4. anon public 키를 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
5. service_role 키를 `SUPABASE_SERVICE_ROLE_KEY`에 입력

#### OpenAI 설정
1. https://platform.openai.com/api-keys 접속
2. 새 API 키 생성
3. 생성된 키를 `OPENAI_API_KEY`에 입력

### Step 4: 데이터베이스 설정
```bash
# Supabase 마이그레이션 적용 (프로젝트의 SQL 파일들을 Supabase 콘솔에서 실행)
```

자세한 마이그레이션 방법은 `README.md`의 "🗄️ Supabase 마이그레이션 적용 순서" 섹션을 참조하세요.

### Step 5: 개발 서버 실행
```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속하여 확인!

## 🎯 빠른 체크리스트

- [ ] Node.js 18+ 설치됨
- [ ] pnpm 설치됨
- [ ] 프로젝트 클론됨
- [ ] `pnpm install` 완료
- [ ] `.env.local` 파일 생성 및 설정 완료
- [ ] Supabase 프로젝트 생성 및 연결
- [ ] OpenAI API 키 설정
- [ ] 데이터베이스 마이그레이션 완료
- [ ] `pnpm dev` 실행 및 로컬 서버 확인

## 🆘 문제 해결

### 자주 발생하는 문제들

1. **포트 에러 (EADDRINUSE)**
   ```bash
   # 다른 포트로 실행
   pnpm dev -- -p 3001
   ```

2. **데이터베이스 연결 에러**
   - `.env.local`의 Supabase URL과 키 확인
   - Supabase 프로젝트가 활성화되어 있는지 확인

3. **OpenAI API 에러**
   - API 키가 올바른지 확인
   - OpenAI 계정에 충분한 크레딧이 있는지 확인

## 📞 지원

문제가 발생하면 언제든 연락주세요:
- Email: mediways.dev@gmail.com

---

**💡 팁**: 개발하면서 `pnpm dev`를 실행해두고, 파일을 수정하면 자동으로 새로고침됩니다!
