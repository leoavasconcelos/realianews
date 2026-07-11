CREATE OR REPLACE FUNCTION public.get_admin_analytics()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ),
  -- Relevance stats: only articles created in the last 30 days
  -- (matches the "últimos 30 dias" window shown in the UI).
  recent_news AS (
    SELECT n.id, n.source_id, n.region, n.is_relevant
    FROM news n
    WHERE n.created_at >= (now() - INTERVAL '30 days')
  ),
  relevance_totals AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_relevant = true)  AS relevant,
      COUNT(*) FILTER (WHERE is_relevant = false) AS rejected,
      COUNT(*) FILTER (WHERE is_relevant IS NULL) AS pending
    FROM recent_news
  ),
  relevance_by_source AS (
    SELECT
      COALESCE(src.name, 'Unknown') AS name,
      COUNT(*) FILTER (WHERE rn.is_relevant = true)  AS relevant,
      COUNT(*) FILTER (WHERE rn.is_relevant = false) AS rejected,
      COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) AS evaluated,
      CASE
        WHEN COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) = 0 THEN 0
        ELSE ROUND(
          100.0 * COUNT(*) FILTER (WHERE rn.is_relevant = false)
          / COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL),
          1
        )
      END AS rejection_rate
    FROM recent_news rn
    LEFT JOIN sources src ON src.id = rn.source_id
    GROUP BY COALESCE(src.name, 'Unknown')
    HAVING COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) > 0
    ORDER BY COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) DESC
  ),
  relevance_by_region AS (
    SELECT
      COALESCE(rn.region, 'Unknown') AS region,
      COUNT(*) FILTER (WHERE rn.is_relevant = true)  AS relevant,
      COUNT(*) FILTER (WHERE rn.is_relevant = false) AS rejected,
      COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) AS evaluated,
      CASE
        WHEN COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) = 0 THEN 0
        ELSE ROUND(
          100.0 * COUNT(*) FILTER (WHERE rn.is_relevant = false)
          / COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL),
          1
        )
      END AS rejection_rate
    FROM recent_news rn
    GROUP BY COALESCE(rn.region, 'Unknown')
    HAVING COUNT(*) FILTER (WHERE rn.is_relevant IS NOT NULL) > 0
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
    'topSavedNews', (SELECT COALESCE(json_agg(json_build_object('id', id, 'count', count)), '[]'::json) FROM top_saved_news),
    'relevanceTotals', (SELECT row_to_json(relevance_totals.*) FROM relevance_totals),
    'relevanceBySource', (SELECT COALESCE(json_agg(json_build_object('name', name, 'relevant', relevant, 'rejected', rejected, 'evaluated', evaluated, 'rejectionRate', rejection_rate)), '[]'::json) FROM relevance_by_source),
    'relevanceByRegion', (SELECT COALESCE(json_agg(json_build_object('region', region, 'relevant', relevant, 'rejected', rejected, 'evaluated', evaluated, 'rejectionRate', rejection_rate)), '[]'::json) FROM relevance_by_region)
  ) INTO result;

  RETURN result;
END;
$function$;