-- Rate limiting을 위한 API 요청 로그 테이블
CREATE TABLE IF NOT EXISTS api_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_api_requests_user_endpoint ON api_requests(user_id, endpoint);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);

-- 30일 이상된 로그 자동 삭제를 위한 정책
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM api_requests
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 매일 실행되는 정리 작업 (Supabase 대시보드에서 크론잡으로 설정 필요)
-- 예: SELECT cleanup_old_api_requests();