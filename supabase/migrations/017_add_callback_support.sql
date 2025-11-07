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

-- kie_task_id 타입을 TEXT에서 JSONB로 변경 (배열 검색 지원)
-- 기존 TEXT 값을 JSONB 배열로 변환
DO $$
BEGIN
  -- kie_task_id가 TEXT 타입인 경우에만 변환
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shorts_conversions'
    AND column_name = 'kie_task_id'
    AND data_type = 'text'
  ) THEN
    -- TEXT를 JSONB 배열로 변환
    ALTER TABLE shorts_conversions
    ALTER COLUMN kie_task_id TYPE JSONB
    USING CASE
      WHEN kie_task_id IS NULL THEN NULL
      WHEN kie_task_id ~ '^\[.*\]$' THEN kie_task_id::jsonb  -- 이미 JSON 배열
      ELSE to_jsonb(ARRAY[kie_task_id])  -- 단일 값을 배열로 변환
    END;
  END IF;
END $$;

-- raw_video_url도 JSONB로 변환 (일관성)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shorts_conversions'
    AND column_name = 'raw_video_url'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE shorts_conversions
    ALTER COLUMN raw_video_url TYPE JSONB
    USING CASE
      WHEN raw_video_url IS NULL THEN NULL
      WHEN raw_video_url ~ '^\[.*\]$' THEN raw_video_url::jsonb
      ELSE to_jsonb(ARRAY[raw_video_url])
    END;
  END IF;
END $$;

-- GIN 인덱스 추가 (JSONB 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_shorts_conversions_kie_task_id
ON shorts_conversions USING gin (kie_task_id);

CREATE INDEX IF NOT EXISTS idx_shorts_conversions_raw_video_url
ON shorts_conversions USING gin (raw_video_url);

COMMENT ON COLUMN shorts_conversions.current_segment IS '현재 생성 중인 세그먼트 번호 (0-based)';
COMMENT ON COLUMN shorts_conversions.callback_received IS 'Callback 수신 여부';
COMMENT ON COLUMN shorts_conversions.last_callback_at IS '마지막 callback 수신 시간';
COMMENT ON COLUMN shorts_conversions.kie_task_id IS 'kie.ai taskId 배열 (JSONB)';
COMMENT ON COLUMN shorts_conversions.raw_video_url IS '생성된 영상 URL 배열 (JSONB)';
