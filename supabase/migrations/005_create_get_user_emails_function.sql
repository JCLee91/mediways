-- Create a function to get user emails by user_ids
-- This function bypasses RLS since it runs with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_emails(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email 
  FROM auth.users 
  WHERE id = ANY(user_ids);
$$;