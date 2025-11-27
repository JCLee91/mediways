-- 쇼츠 기능 관련 누락된 컬럼이나 테이블을 안전하게 추가하는 종합 스크립트
-- 이미 존재하는 경우 건너뛰므로 여러 번 실행해도 안전합니다.

-- 1. 테이블이 없으면 생성 (기본 컬럼 포함)
CREATE TABLE IF NOT EXISTS shorts_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_url TEXT NOT NULL,
  blog_title TEXT,
  blog_content TEXT,
  blog_images TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  summary TEXT,
  segments JSONB,
  kie_task_id TEXT,
  raw_video_url TEXT,
  final_video_url TEXT,
  video_duration INTEGER,
  error_message TEXT,
  generation_logs JSONB[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 2. 추가 컬럼들 안전하게 생성 (IF NOT EXISTS)

-- video_urls: 개별 영상 URL 캐싱용 (migration 018)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shorts_conversions' AND column_name = 'video_urls') THEN
    ALTER TABLE shorts_conversions ADD COLUMN video_urls JSONB DEFAULT NULL;
  END IF;
END $$;

-- shorts_title: AI가 생성한 쇼츠 제목 (migration 019)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shorts_conversions' AND column_name = 'shorts_title') THEN
    ALTER TABLE shorts_conversions ADD COLUMN shorts_title TEXT;
  END IF;
END $$;

-- 3. 인덱스 안전하게 생성
CREATE INDEX IF NOT EXISTS idx_shorts_conversions_user_id ON shorts_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_shorts_conversions_status ON shorts_conversions(status);
CREATE INDEX IF NOT EXISTS idx_shorts_conversions_created_at ON shorts_conversions(created_at DESC);

-- 4. RLS 정책 (기존 정책이 없을 경우에만 생성은 복잡하므로, DROP 후 재생성 방식 사용하거나 생략. 여기서는 확인용 주석만 남김)
-- RLS는 중복 생성 시 에러가 발생할 수 있으므로, 필요하다면 아래 쿼리를 사용하세요.
-- ALTER TABLE shorts_conversions ENABLE ROW LEVEL SECURITY;


