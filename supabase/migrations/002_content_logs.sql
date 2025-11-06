-- 콘텐츠 생성 로그 테이블 (간단하게)
CREATE TABLE IF NOT EXISTS content_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'blog', 'sns'
  request_data JSONB NOT NULL, -- 요청 데이터
  generated_content TEXT NOT NULL, -- 생성된 콘텐츠
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_logs_created_at ON content_logs(created_at DESC);
CREATE INDEX idx_content_logs_user_email ON content_logs(user_email);

-- 관리자 이메일 설정 (예시)
-- UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{is_admin}', 'true') 
-- WHERE email = 'admin@example.com';