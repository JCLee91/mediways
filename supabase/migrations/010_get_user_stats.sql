-- Aggregated per-user statistics with pagination and search
-- Returns rows with a window total_count for client-side pagination UI

CREATE OR REPLACE FUNCTION public.get_user_stats(
  search text,
  page integer,
  page_size integer
)
RETURNS TABLE(
  user_id uuid,
  email text,
  total_generations integer,
  created_at timestamptz,
  last_activity timestamptz,
  total_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT 
      g.user_id,
      g.user_email AS email,
      MIN(g.created_at) AS created_at,
      MAX(g.created_at) AS last_activity,
      COUNT(*)::integer AS total_generations
    FROM public.generations_with_email g
    WHERE (
      search IS NULL OR search = '' OR g.user_email ILIKE '%' || search || '%'
    )
    GROUP BY g.user_id, g.user_email
  ),
  paged AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY last_activity DESC
    OFFSET GREATEST((page - 1) * page_size, 0)
    LIMIT page_size
  )
  SELECT user_id, email, total_generations, created_at, last_activity, total_count
  FROM paged;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stats(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_stats(text, integer, integer) TO authenticated;


