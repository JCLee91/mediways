-- 쇼츠 제목 컬럼 추가
ALTER TABLE shorts_conversions ADD COLUMN IF NOT EXISTS shorts_title TEXT;

-- 코멘트
COMMENT ON COLUMN shorts_conversions.shorts_title IS 'AI가 생성한 쇼츠 제목 (15자 이내)';
