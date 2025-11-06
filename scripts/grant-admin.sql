-- Direct SQL script to grant admin privileges to admin@admin.com
-- Run this script directly in Supabase SQL Editor

-- First, check if the user exists
DO $$
DECLARE
    user_exists boolean;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') INTO user_exists;
    
    IF user_exists THEN
        -- Update the user metadata to grant admin privileges
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{is_admin}',
            'true'::jsonb
        )
        WHERE email = 'admin@admin.com';
        
        RAISE NOTICE 'Admin privileges granted to admin@admin.com';
    ELSE
        RAISE NOTICE 'User admin@admin.com does not exist. Please create the user first.';
    END IF;
END $$;

-- Show the result
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'is_admin' as is_admin,
    created_at
FROM auth.users 
WHERE email = 'admin@admin.com';