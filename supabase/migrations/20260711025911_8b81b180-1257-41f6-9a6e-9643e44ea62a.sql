CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin_or_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH
  day_series AS (
    SELECT generate_series(
      (CURRENT_DATE - INTERVAL '29 days')::date,
      CURRENT_DATE::date,
      '1 day'::interval
    )::date AS day
  ),
  news_by_day AS (
    SELECT ds.day, COUNT(n.id) AS count
    FROM day_series ds
    LEFT JOIN news n ON (n.published_at AT TIME ZONE 'UTC')::date = ds.day
    GROUP BY ds.day
  ),
  users_by_day AS (
    SELECT ds.day, COUNT(p.id) AS count
    FROM day_series ds
    LEFT JOIN profiles p ON (p.created_at AT TIME ZONE 'UTC')::date = ds.day
    GROUP BY ds.day
  ),
  saves_by_day AS (
    SELECT ds.day, COUNT(s.id) AS count
    FROM day_series ds
    LEFT JOIN user_saved_items s ON (s.saved_at AT TIME ZONE 'UTC')::date = ds.day
    GROUP BY ds.day
  ),
  news_by_source AS (
    SELECT COALESCE(src.name, 'Unknown') AS name, COUNT(*) AS count
    FROM news n
    LEFT JOIN sources src ON src.id = n.source_id
    GROUP BY COALESCE(src.name, 'Unknown')
  ),
  news_by_region AS (
    SELECT COALESCE(n.region, 'Unknown') AS region, COUNT(*) AS count
    FROM news n
    GROUP BY COALESCE(n.region, 'Unknown')
  ),
  users_by_region AS (
    SELECT region_value AS region, COUNT(*) AS count
    FROM profiles p
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(p.preferred_regions) = 'array'
        THEN p.preferred_regions
        ELSE '[]'::jsonb
      END
    ) AS region_value
    GROUP BY region_value
  ),
  top_saved_news AS (
    SELECT news_id AS id, COUNT(*) AS count
    FROM user_saved_items
    GROUP BY news_id
    ORDER BY COUNT(*) DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'totalNews', (SELECT COUNT(*) FROM news),
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'totalSaves', (SELECT COUNT(*) FROM user_saved_items),
    'totalSources', (SELECT COUNT(*) FROM sources),
    'activeSources', (SELECT COUNT(*) FROM sources WHERE is_active = true),
    'totalTopics', (SELECT COUNT(*) FROM topics),
    'newsByDay', (SELECT COALESCE(json_agg(json_build_object('dateStr', to_char(day, 'DD/MM'), 'count', count) ORDER BY day), '[]'::json) FROM news_by_day),
    'usersByDay', (SELECT COALESCE(json_agg(json_build_object('dateStr', to_char(day, 'DD/MM'), 'count', count) ORDER BY day), '[]'::json) FROM users_by_day),
    'savesByDay', (SELECT COALESCE(json_agg(json_build_object('dateStr', to_char(day, 'DD/MM'), 'count', count) ORDER BY day), '[]'::json) FROM saves_by_day),
    'newsBySource', (SELECT COALESCE(json_agg(json_build_object('name', name, 'count', count)), '[]'::json) FROM news_by_source),
    'newsByRegion', (SELECT COALESCE(json_agg(json_build_object('region', region, 'count', count)), '[]'::json) FROM news_by_region),
    'usersByRegion', (SELECT COALESCE(json_agg(json_build_object('region', region, 'count', count)), '[]'::json) FROM users_by_region),
    'topSavedNews', (SELECT COALESCE(json_agg(json_build_object('id', id, 'count', count)), '[]'::json) FROM top_saved_news)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;