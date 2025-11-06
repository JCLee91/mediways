-- Update get_admin_dashboard to use KST (Asia/Seoul) day boundary for today_logs

CREATE OR REPLACE FUNCTION public.get_admin_dashboard(p_recent_limit integer DEFAULT 5)
RETURNS TABLE (
  total_logs bigint,
  today_logs bigint,
  total_users bigint,
  recent_logs jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Total generations
    (SELECT COUNT(*) FROM public.generations) AS total_logs,

    -- Today's generations by KST day start converted to UTC for comparison
    (SELECT COUNT(*) FROM public.generations
      WHERE created_at >= (
        date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
      )
    ) AS today_logs,

    -- Distinct users via existing function
    (SELECT public.count_distinct_generations_users()) AS total_users,

    -- Recent logs with email
    (
      SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      FROM (
        SELECT id, user_id, user_email, type, sub_type, created_at
        FROM public.generations_with_email
        ORDER BY created_at DESC
        LIMIT p_recent_limit
      ) AS t
    ) AS recent_logs
  ;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer) TO authenticated;


