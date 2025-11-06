-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all generations" ON public.generations;
DROP POLICY IF EXISTS "Admins can delete all generations" ON public.generations;

-- Add admin policies for generations table
-- Admins can view all generations from all users
CREATE POLICY "Admins can view all generations" ON public.generations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'is_admin')::text = 'true'
        )
    );

-- Admins can delete all generations
CREATE POLICY "Admins can delete all generations" ON public.generations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'is_admin')::text = 'true'
        )
    );