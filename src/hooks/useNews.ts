import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NewsItem } from '@/components/NewsCard';

export interface DbNews {
  id: string;
  title: string;
  summary_ai: string | null;
  full_text: string | null;
  source_id: string | null;
  source_url: string;
  image_url: string | null;
  audio_url: string | null;
  topics: string[];
  published_at: string;
  is_trending: boolean;
  read_time: string;
  created_at: string;
  region: string | null;
}

export interface DbSource {
  id: string;
  name: string;
  base_url: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface DbTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

// Helper to extract source name from URL when source_id is missing
const extractSourceFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainMap: Record<string, string> = {
      'valor.globo.com': 'Valor Econômico',
      'folha.uol.com.br': 'Folha de S.Paulo',
      'estadao.com.br': 'Estadão',
      'infomoney.com.br': 'InfoMoney',
      'exame.com': 'Exame',
      'forbes.com.br': 'Forbes Brasil',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'wsj.com': 'Wall Street Journal',
      'ft.com': 'Financial Times',
      'cnbc.com': 'CNBC',
      'inman.com': 'Inman News',
      'housingwire.com': 'HousingWire',
      'realtor.com': 'Realtor.com',
      'propertyweek.com': 'Property Week',
      'portalvgv.com.br': 'Portal VGV',
      'imovelweb.com.br': 'Imovelweb',
      'zapimoveis.com.br': 'ZAP Imóveis',
      'vivareal.com.br': 'VivaReal',
      'abrainc.org.br': 'ABRAINC',
    };
    return domainMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Fonte desconhecida';
  }
};

// Helper to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Agora';
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ontem';
  return `${diffDays} dias atrás`;
};

// Available regions for filtering
export const REGIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'Brazil', label: '🇧🇷 Brasil' },
  { id: 'USA', label: '🇺🇸 EUA' },
  { id: 'Europe', label: '🇪🇺 Europa' },
  { id: 'Middle East', label: '🌍 Oriente Médio' },
] as const;

export type RegionFilter = typeof REGIONS[number]['id'];

// Fetch all news with source info
export const useNews = (topicFilter?: string, regionFilter?: RegionFilter) => {
  return useQuery({
    queryKey: ['news', topicFilter, regionFilter],
    queryFn: async () => {
      try {
        const { data: news, error } = await supabase
          .from('news')
          .select('*')
          .order('published_at', { ascending: false });

        if (error) {
          console.error('Supabase news fetch error:', error);
          throw error;
        }

        console.log('News fetched from DB:', news?.length || 0);

        const { data: sources, error: sourcesError } = await supabase
          .from('sources')
          .select('*');

        if (sourcesError) {
          console.error('Supabase sources fetch error:', sourcesError);
        }

        const sourceMap = new Map(sources?.map(s => [s.id, s]) || []);

        // Filter to only show news with AI summary (processed and relevant)
        let filteredNews = (news || []).filter(item => item.summary_ai && item.summary_ai.trim().length > 0);
        console.log('News with summary_ai:', filteredNews.length);

        // Apply region filter
        if (regionFilter && regionFilter !== 'all') {
          filteredNews = filteredNews.filter(item => item.region === regionFilter);
        }

        // Transform to NewsItem format
        let newsItems: NewsItem[] = filteredNews.map((item) => {
          const source = item.source_id ? sourceMap.get(item.source_id) : null;
          
          // Robust topics parsing with error handling
          let topics: string[] = [];
          try {
            if (Array.isArray(item.topics)) {
              topics = item.topics as string[];
            } else if (typeof item.topics === 'string') {
              topics = JSON.parse(item.topics || '[]');
            } else if (item.topics && typeof item.topics === 'object') {
              topics = Object.values(item.topics) as string[];
            }
          } catch (parseError) {
            console.warn('Failed to parse topics for news:', item.id, parseError);
            topics = [];
          }
          
          return {
            id: item.id,
            title: item.title,
            summary: item.summary_ai || '',
            source: source?.name || extractSourceFromUrl(item.source_url),
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
            publishedAt: formatTimeAgo(item.published_at),
            topics: topics,
            readTime: item.read_time || '3 min',
            trending: item.is_trending,
            sourceUrl: item.source_url,
            audioUrl: item.audio_url,
            region: item.region || 'Brazil',
          };
        });

        // Apply topic filter
        if (topicFilter && topicFilter !== 'Todos') {
          newsItems = newsItems.filter(news => 
            news.topics.some(t => t.toLowerCase().includes(topicFilter.toLowerCase()))
          );
        }

        console.log('Final news items:', newsItems.length);
        return newsItems;
      } catch (err) {
        console.error('useNews query error:', err);
        throw err;
      }
    },
  });
};

// Fetch topics
export const useTopics = () => {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as DbTopic[];
    },
  });
};

// Fetch sources
export const useSources = () => {
  return useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as DbSource[];
    },
  });
};

// Fetch user's saved items
export const useSavedItems = (userId?: string) => {
  return useQuery({
    queryKey: ['saved-items', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_saved_items')
        .select('news_id')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(item => item.news_id);
    },
    enabled: !!userId,
  });
};

// Save a news item
export const useSaveNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newsId }: { userId: string; newsId: string }) => {
      const { error } = await supabase
        .from('user_saved_items')
        .insert({ user_id: userId, news_id: newsId });

      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-items', userId] });
    },
  });
};

// Remove a saved news item
export const useUnsaveNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newsId }: { userId: string; newsId: string }) => {
      const { error } = await supabase
        .from('user_saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('news_id', newsId);

      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-items', userId] });
    },
  });
};
