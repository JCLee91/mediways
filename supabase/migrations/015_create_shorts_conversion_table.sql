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

-- Admin policies
CREATE POLICY "Admins can view all conversions"
  ON shorts_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );
