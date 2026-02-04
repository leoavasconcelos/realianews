import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalNews: number;
  totalUsers: number;
  totalSavedItems: number;
  totalTopics: number;
  totalSources: number;
  newsByRegion: { region: string; count: number }[];
  recentNews: { id: string; title: string; published_at: string; region: string }[];
  recentUsers: { id: string; display_name: string; created_at: string }[];
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Fetch all counts in parallel
      const [
        newsResult,
        usersResult,
        savedItemsResult,
        topicsResult,
        sourcesResult,
        recentNewsResult,
        recentUsersResult,
      ] = await Promise.all([
        supabase.from('news').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_saved_items').select('id', { count: 'exact', head: true }),
        supabase.from('topics').select('id', { count: 'exact', head: true }),
        supabase.from('sources').select('id', { count: 'exact', head: true }),
        supabase.from('news')
          .select('id, title, published_at, region')
          .order('published_at', { ascending: false })
          .limit(5),
        supabase.from('profiles')
          .select('id, display_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Get news by region
      const { data: newsData } = await supabase
        .from('news')
        .select('region');

      const regionCounts: Record<string, number> = {};
      newsData?.forEach(news => {
        const region = news.region || 'Unknown';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });

      const newsByRegion = Object.entries(regionCounts).map(([region, count]) => ({
        region,
        count,
      }));

      return {
        totalNews: newsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalSavedItems: savedItemsResult.count || 0,
        totalTopics: topicsResult.count || 0,
        totalSources: sourcesResult.count || 0,
        newsByRegion,
        recentNews: recentNewsResult.data || [],
        recentUsers: recentUsersResult.data || [],
      };
    },
    staleTime: 30000, // 30 seconds
  });
};
