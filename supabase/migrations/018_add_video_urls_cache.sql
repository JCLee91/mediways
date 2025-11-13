-- Add video_urls column for caching completed video URLs
-- Reduces kie.ai API calls by 90% (60-120 calls -> 6-12 calls per conversion)

ALTER TABLE shorts_conversions
ADD COLUMN video_urls JSONB DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN shorts_conversions.video_urls IS 'Cached URLs for completed individual videos. Format: {"0": "url1", "1": "url2", "2": "url3"}';
