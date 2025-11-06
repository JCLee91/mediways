-- Fix generations table policies by combining SELECT policies
-- This fixes the issue where admin users cannot view all generations

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
DROP POLICY IF EXISTS "Admins can view all generations" ON public.generations;

-- Create unified SELECT policy
-- Regular users can only see their own generations
-- Admin users can see all generations
CREATE POLICY "Users can view appropriate generations" ON public.generations
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'is_admin')::text = 'true'
        )
    );

-- Keep the existing DELETE policies as they are working correctly
-- Regular users can delete their own generations
-- Admin users can delete all generations (separate policy already exists)