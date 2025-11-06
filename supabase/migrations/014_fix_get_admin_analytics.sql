-- Fix get_admin_analytics: correct KST boundaries and final JSON aggregation

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
      -- KST midnight converted to UTC timestamptz
      (date_trunc('day', timezone('Asia/Seoul', now())) AT TIME ZONE 'Asia/Seoul') AS kst_today_utc,
      (date_trunc('day', (timezone('Asia/Seoul', now()) - make_interval(days => p_days - 1))) AT TIME ZONE 'Asia/Seoul') AS kst_start_utc
  ),
  gs AS (
    -- Generate KST day ticks as UTC timestamptz
    SELECT generate_series(b.kst_start_utc, b.kst_today_utc, interval '1 day') AS kst_day_utc
    FROM bounds b
  ),
  g AS (
    -- Restrict to requested window using UTC timestamptz bounds
    SELECT created_at, type, sub_type, user_id
    FROM public.generations
    WHERE created_at >= (SELECT kst_start_utc FROM bounds)
      AND created_at < (SELECT kst_today_utc FROM bounds) + interval '1 day'
  ),
  daily AS (
    SELECT
      to_char(((gs.kst_day_utc AT TIME ZONE 'Asia/Seoul')::date), 'YYYY.MM.DD') AS date,
      COALESCE(COUNT(g.created_at), 0) AS count
    FROM gs
    LEFT JOIN g
      ON g.created_at >= gs.kst_day_utc
     AND g.created_at < gs.kst_day_utc + interval '1 day'
    GROUP BY gs.kst_day_utc
    ORDER BY gs.kst_day_utc
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
    -- Aggregate from CTEs via subqueries
    (SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.date), '[]'::jsonb) FROM daily d) AS daily_stats,
    (SELECT COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.count DESC), '[]'::jsonb) FROM type_counts tc) AS type_stats,
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


