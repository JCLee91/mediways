-- Admin analytics aggregation via SQL (KST day boundaries)

CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_days integer DEFAULT 7)
RETURNS TABLE (
  daily_stats jsonb,
  type_stats jsonb,
  total_stats jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul') AS kst_today_start,
      (date_trunc('day', (now() AT TIME ZONE 'Asia/Seoul') - make_interval(days => p_days - 1)) AT TIME ZONE 'Asia/Seoul') AS kst_start
  ),
  gs AS (
    SELECT generate_series(b.kst_start, b.kst_today_start, interval '1 day') AS kst_day
    FROM bounds b
  ),
  g AS (
    SELECT created_at, type, sub_type, user_id
    FROM public.generations
    WHERE created_at >= (SELECT kst_start FROM bounds)
      AND created_at < (SELECT kst_today_start FROM bounds) + interval '1 day'
  ),
  daily AS (
    SELECT to_char((gs.kst_day AT TIME ZONE 'Asia/Seoul')::date, 'YYYY.MM.DD') AS date,
           COALESCE(COUNT(g.created_at), 0) AS count
    FROM gs
    LEFT JOIN g
      ON g.created_at >= gs.kst_day
     AND g.created_at < gs.kst_day + interval '1 day'
    GROUP BY gs.kst_day
    ORDER BY gs.kst_day
  ),
  type_counts AS (
    SELECT
      CASE WHEN sub_type IS NOT NULL AND sub_type <> '' THEN type || ' (' || sub_type || ')' ELSE type END AS type,
      COUNT(*)::int AS count
    FROM g
    GROUP BY 1
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM g) AS total_generations,
      (SELECT COUNT(DISTINCT user_id) FROM g) AS total_users
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(daily)), '[]'::jsonb) AS daily_stats,
    COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY count DESC), '[]'::jsonb) AS type_stats,
    jsonb_build_object(
      'totalGenerations', COALESCE((SELECT total_generations FROM totals), 0),
      'totalUsers', COALESCE((SELECT total_users FROM totals), 0),
      'avgPerUser', CASE WHEN (SELECT total_users FROM totals) > 0 THEN ROUND((SELECT total_generations FROM totals)::numeric / (SELECT total_users FROM totals))::int ELSE 0 END,
      'avgPerDay', CASE WHEN p_days > 0 THEN ROUND((SELECT total_generations FROM totals)::numeric / p_days)::int ELSE 0 END
    ) AS total_stats
  ;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(integer) TO authenticated;


