import React, { useState, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  Newspaper, 
  Globe, 
  Building2,
  ChevronRight,
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewsCard, { NewsItem } from './NewsCard';
import { useNews, useSources, useTopics, REGIONS, RegionFilter } from '@/hooks/useNews';

interface ExploreScreenProps {
  onNewsClick: (news: NewsItem) => void;
  onSaveNews: (id: string) => void;
  onShareNews: (id: string) => void;
  savedItems?: string[];
}

const ExploreScreen = React.forwardRef<HTMLDivElement, ExploreScreenProps>(
  ({ onNewsClick, onSaveNews, onShareNews, savedItems }, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('all');
    const [activeSection, setActiveSection] = useState<'discover' | 'search'>('discover');

    const { data: allNews, isLoading: newsLoading } = useNews();
    const { data: sources } = useSources();
    const { data: topics } = useTopics();

    // Get trending topics from news
    const trendingTopics = useMemo(() => {
      if (!allNews) return [];
      const topicCount: Record<string, number> = {};
      
      allNews.forEach(news => {
        news.topics.forEach(topic => {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        });
      });
      
      return Object.entries(topicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    }, [allNews]);

    // Filter news based on search and filters
    const filteredNews = useMemo(() => {
      if (!allNews) return [];
      
      let results = allNews;
      
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        results = results.filter(news => 
          news.title.toLowerCase().includes(query) ||
          news.summary.toLowerCase().includes(query) ||
          news.topics.some(t => t.toLowerCase().includes(query)) ||
          news.source.toLowerCase().includes(query)
        );
      }
      
      // Topic filter
      if (selectedTopic) {
        results = results.filter(news => 
          news.topics.some(t => t.toLowerCase() === selectedTopic.toLowerCase())
        );
      }
      
      // Source filter
      if (selectedSource) {
        results = results.filter(news => news.source === selectedSource);
      }
      
      // Region filter
      if (selectedRegion !== 'all') {
        results = results.filter(news => news.region === selectedRegion);
      }
      
      return results;
    }, [allNews, searchQuery, selectedTopic, selectedSource, selectedRegion]);

    // Check if any filter is active
    const hasActiveFilters = selectedTopic || selectedSource || selectedRegion !== 'all';

    const clearFilters = () => {
      setSelectedTopic(null);
      setSelectedSource(null);
      setSelectedRegion('all');
    };

    // Get source with news count
    const sourcesWithCount = useMemo(() => {
      if (!allNews || !sources) return [];
      
      const sourceCount: Record<string, number> = {};
      allNews.forEach(news => {
        sourceCount[news.source] = (sourceCount[news.source] || 0) + 1;
      });
      
      return sources
        .filter(s => sourceCount[s.name])
        .map(s => ({ ...s, newsCount: sourceCount[s.name] || 0 }))
        .sort((a, b) => b.newsCount - a.newsCount);
    }, [allNews, sources]);

    const isSearchMode = searchQuery.trim().length > 0 || hasActiveFilters;

    return (
      <div ref={ref} className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="px-4 py-4 space-y-4 bg-background border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar notícias, tópicos, fontes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 bg-secondary border-0 rounded-xl text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros:</span>
              {selectedTopic && (
                <Badge variant="secondary" className="gap-1">
                  {selectedTopic}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTopic(null)} />
                </Badge>
              )}
              {selectedSource && (
                <Badge variant="secondary" className="gap-1">
                  {selectedSource}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSource(null)} />
                </Badge>
              )}
              {selectedRegion !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {REGIONS.find(r => r.id === selectedRegion)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRegion('all')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6">
                Limpar tudo
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {isSearchMode ? (
            // Search Results
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredNews.length} resultado{filteredNews.length !== 1 ? 's' : ''} encontrado{filteredNews.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {newsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredNews.length > 0 ? (
                <div className="space-y-4">
                  {filteredNews.map((news, index) => (
                    <div 
                      key={news.id} 
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <NewsCard
                        news={news}
                        onSave={onSaveNews}
                        onShare={onShareNews}
                        onClick={onNewsClick}
                        isSaved={savedItems?.includes(news.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente outros termos ou filtros</p>
                </div>
              )}
            </div>
          ) : (
            // Discovery Mode
            <div className="py-4 space-y-6">
              {/* Trending Topics */}
              <section className="px-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold text-foreground">Tópicos em Alta</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map(({ name, count }) => (
                    <button
                      key={name}
                      onClick={() => setSelectedTopic(name)}
                      className="px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {name}
                      <span className="text-xs opacity-60">({count})</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Explore by Region */}
              <section className="px-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-teal" />
                  <h2 className="text-lg font-bold text-foreground">Por Região</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {REGIONS.filter(r => r.id !== 'all').map((region) => (
                    <button
                      key={region.id}
                      onClick={() => setSelectedRegion(region.id)}
                      className="p-4 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all text-left group"
                    >
                      <span className="text-2xl mb-2 block">{region.label.split(' ')[0]}</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {region.label.split(' ').slice(1).join(' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </section>

              {/* Browse Sources */}
              <section>
                <div className="flex items-center gap-2 mb-4 px-4">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Fontes de Notícias</h2>
                </div>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 px-4 pb-2">
                    {sourcesWithCount.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => setSelectedSource(source.name)}
                        className="flex-shrink-0 w-32 p-4 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all text-center group"
                      >
                        {source.logo_url ? (
                          <img 
                            src={source.logo_url} 
                            alt={source.name}
                            className="w-10 h-10 object-contain mx-auto mb-2 rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {source.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {source.newsCount} notícia{source.newsCount !== 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </section>

              {/* All Topics */}
              <section className="px-4 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-graphite" />
                  <h2 className="text-lg font-bold text-foreground">Todos os Tópicos</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {topics?.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.name)}
                      className="p-3 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all text-left flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg">
                        {topic.icon || '📰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {topic.name}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {topic.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }
);

ExploreScreen.displayName = 'ExploreScreen';

export default ExploreScreen;
