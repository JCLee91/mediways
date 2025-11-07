-- Callback 지원을 위한 테이블 수정

-- 현재 세그먼트 추적
ALTER TABLE shorts_conversions
ADD COLUMN IF NOT EXISTS current_segment INTEGER DEFAULT 0;

-- Callback 상태 추적
ALTER TABLE shorts_conversions
ADD COLUMN IF NOT EXISTS callback_received BOOLEAN DEFAULT FALSE;

-- 마지막 callback 시간
ALTER TABLE shorts_conversions
ADD COLUMN IF NOT EXISTS last_callback_at TIMESTAMP;

-- 인덱스 추가 (kie_task_id로 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_shorts_conversions_kie_task_id
ON shorts_conversions USING gin (kie_task_id);

COMMENT ON COLUMN shorts_conversions.current_segment IS '현재 생성 중인 세그먼트 번호 (0-based)';
COMMENT ON COLUMN shorts_conversions.callback_received IS 'Callback 수신 여부';
COMMENT ON COLUMN shorts_conversions.last_callback_at IS '마지막 callback 수신 시간';
