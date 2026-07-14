import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Fallback images for articles that have no image at all.
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
  'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800',
  'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800',
  'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=800',
];

const pickFallbackImage = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

// Available regions for filtering
export const REGIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'Brazil', label: '🇧🇷 Brasil' },
  { id: 'USA', label: '🇺🇸 EUA' },
  { id: 'Europe', label: '🇪🇺 Europa' },
  { id: 'Middle East', label: '🌍 Oriente Médio' },
  { id: 'World', label: '🌐 Mundo' },
] as const;

export type RegionFilter = typeof REGIONS[number]['id'];

export const NEWS_PAGE_SIZE = 12;

interface NewsPage {
  items: NewsItem[];
  nextPage: number | null;
}

// Maps a raw Supabase row (news + embedded sources) to the NewsItem shape
// the UI consumes. Shared by the main feed query and the "unseen
// highlights" section so both render identically.
const mapDbRowToNewsItem = (item: any): NewsItem => {
  let topics: string[] = [];
  try {
    if (Array.isArray(item.topics)) {
      topics = item.topics as string[];
    } else if (typeof item.topics === 'string') {
      topics = JSON.parse(item.topics || '[]');
    } else if (item.topics && typeof item.topics === 'object') {
      topics = Object.values(item.topics) as string[];
    }
  } catch {
    topics = [];
  }

  const source = item.sources || null;

  return {
    id: item.id,
    title: item.title,
    titleOriginal: item.title_original ?? null,
    summary: item.summary_ai || '',
    source: source?.name || extractSourceFromUrl(item.source_url),
    sourceLogo: source?.logo_url || null,
    imageUrl: item.image_url || pickFallbackImage(item.id),
    publishedAt: formatTimeAgo(item.published_at),
    topics,
    readTime: item.read_time || '3 min',
    trending: item.is_trending,
    sourceUrl: item.source_url,
    audioUrl: item.audio_url,
    region: item.region || 'Brazil',
  };
};

const TOPIC_ALIASES: Record<string, string[]> = {
  'fundos imobiliários': ['fundos imobiliários', 'fundo imobiliário', 'fiis', 'fii', 'reit', 'reits'],
  'mercado imobiliário': ['mercado imobiliário', 'setor imobiliário'],
  'comercial': ['comercial', 'corporativo', 'escritório', 'office'],
  'logística': ['logística', 'logistic', 'galpão', 'warehouse', 'industrial'],
  'governo': ['governo', 'mcmv', 'minha casa minha vida', 'casa verde amarela'],
};

const applyTopicFilter = (items: NewsItem[], topicFilter?: string): NewsItem[] => {
  if (!topicFilter || topicFilter === 'Todos') return items;
  const filterLc = topicFilter.toLowerCase();
  const candidates = TOPIC_ALIASES[filterLc] ?? [filterLc];
  return items.filter(news =>
    news.topics.some(t => {
      const tagLc = t.toLowerCase();
      return candidates.some(c => tagLc === c || tagLc.includes(c) || c.includes(tagLc));
    })
  );
};

// Paginated news feed using infinite query.
export const useNews = (topicFilter?: string, regionFilter?: RegionFilter, preferredRegions?: string[]) => {
  return useInfiniteQuery<NewsPage>({
    queryKey: ['news', topicFilter, regionFilter, preferredRegions],
    initialPageParam: 0,
    retry: 3,
    retryDelay: 1000,
    staleTime: 60_000,
    queryFn: async ({ pageParam = 0 }) => {
      const page = pageParam as number;
      const from = page * NEWS_PAGE_SIZE;
      const to = from + NEWS_PAGE_SIZE - 1;

      let query = supabase
        .from('news')
        .select('*, sources(name, logo_url)')
        .not('summary_ai', 'is', null)
        .order('published_at', { ascending: false })
        .range(from, to);

      if (regionFilter && regionFilter !== 'all') {
        query = query.eq('region', regionFilter);
      } else if (preferredRegions && preferredRegions.length > 0) {
        query = query.in('region', preferredRegions);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase news fetch error:', error);
        throw error;
      }

      const rows = data || [];

      let items: NewsItem[] = rows.map(mapDbRowToNewsItem);

      items = applyTopicFilter(items, topicFilter);

      const nextPage = rows.length === NEWS_PAGE_SIZE ? page + 1 : null;
      return { items, nextPage };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

// Flatten infinite-query pages into a single NewsItem[] for consumers.
export const flattenNewsPages = (
  data: { pages: NewsPage[] } | undefined
): NewsItem[] => data?.pages.flatMap((p) => p.items) ?? [];

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

// Fetch user's read news count
export const useReadNewsCount = (userId?: string) => {
  return useQuery({
    queryKey: ['read-news-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('user_read_news')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
};

// Mark a news as read
export const useMarkNewsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newsId }: { userId: string; newsId: string }) => {
      const { error } = await supabase
        .from('user_read_news')
        .upsert({ user_id: userId, news_id: newsId }, { onConflict: 'user_id,news_id' });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['read-news-count', userId] });
    },
  });
};
