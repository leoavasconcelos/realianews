import FeedHeader from '@/components/FeedHeader';
import RegionFilter from '@/components/RegionFilter';
import FilterPills from '@/components/FilterPills';
import PullToRefresh from '@/components/PullToRefresh';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import UnseenHighlights from '@/components/UnseenHighlights';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { RegionFilter as RegionFilterType } from '@/hooks/useNews';

interface MercadoScreenProps {
  userId?: string;
  unreadCount: number;
  onNotificationsClick: () => void;
  onLogoClick: () => void;
  activeRegion: RegionFilterType;
  onRegionChange: (region: RegionFilterType) => void;
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onPullRefresh: () => Promise<void>;
  newsLoading: boolean;
  news: NewsItem[];
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onSaveNews: (id: string) => void;
  onShareNews: (id: string) => void;
  onSelectNews: (news: NewsItem) => void;
  savedItems?: string[];
}

export const MercadoScreen = ({
  userId,
  unreadCount,
  onNotificationsClick,
  activeRegion,
  onRegionChange,
  filters,
  activeFilter,
  onFilterChange,
  onPullRefresh,
  newsLoading,
  news,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onSaveNews,
  onShareNews,
  onSelectNews,
  savedItems,
}: MercadoScreenProps) => (
  <div className="flex flex-col min-h-screen pb-20">
    <FeedHeader
      unreadCount={unreadCount}
      onNotificationsClick={onNotificationsClick}
    />

    <div className="px-4 py-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-[57px] z-30 space-y-2">
      <RegionFilter
        activeRegion={activeRegion}
        onRegionChange={onRegionChange}
      />
      <FilterPills
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>

    <PullToRefresh onRefresh={onPullRefresh}>
      <main className="flex-1 px-4 py-4 md:px-6 lg:px-8 md:max-w-7xl md:mx-auto w-full">
        <h1 className="sr-only">Notícias e Inteligência do Mercado Imobiliário</h1>
        <UnseenHighlights userId={userId} onSelectNews={onSelectNews} />
        {newsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {news?.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
              >
                <NewsCard
                  news={item}
                  onSave={onSaveNews}
                  onShare={onShareNews}
                  onClick={onSelectNews}
                  isSaved={savedItems?.includes(item.id)}
                />
              </div>
            ))}

            {news.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma notícia encontrada para este filtro.</p>
              </div>
            )}
          </div>
        )}
        {hasNextPage && !newsLoading && (
          <div className="flex justify-center py-6">
            <Button
              variant="outline"
              onClick={onFetchNextPage}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Carregar mais notícias'
              )}
            </Button>
          </div>
        )}
      </main>
    </PullToRefresh>
  </div>
);

export default MercadoScreen;