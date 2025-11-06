-- Grant admin privileges to admin@admin.com user
-- This updates the user_metadata to include is_admin: true

-- Update the user metadata for admin@admin.com
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{is_admin}',
    'true'::jsonb
)
WHERE email = 'admin@admin.com';

-- Verify the update (optional - you can run this separately to check)
-- SELECT id, email, raw_user_meta_data->>'is_admin' as is_admin 
-- FROM auth.users 
-- WHERE email = 'admin@admin.com';