-- Count distinct users in generations table
-- Uses SECURITY DEFINER to run with elevated privileges if needed

CREATE OR REPLACE FUNCTION public.count_distinct_generations_users()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::integer FROM public.generations;
$$;

GRANT EXECUTE ON FUNCTION public.count_distinct_generations_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_distinct_generations_users() TO authenticated;


