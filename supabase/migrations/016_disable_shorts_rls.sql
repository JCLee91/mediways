-- MVP: RLS 정책 완전히 제거하고 모든 접근 허용
-- 프로덕션 전에 다시 활성화 예정

-- 기존 정책 모두 제거
DROP POLICY IF EXISTS "Users can view their own conversions" ON shorts_conversions;
DROP POLICY IF EXISTS "Users can insert their own conversions" ON shorts_conversions;
DROP POLICY IF EXISTS "Users can update their own conversions" ON shorts_conversions;
DROP POLICY IF EXISTS "Admins can view all conversions" ON shorts_conversions;

-- RLS 비활성화 (MVP용)
ALTER TABLE shorts_conversions DISABLE ROW LEVEL SECURITY;

-- 또는 완전 개방 정책 (선택 사항)
-- ALTER TABLE shorts_conversions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for MVP" ON shorts_conversions FOR ALL USING (true) WITH CHECK (true);
