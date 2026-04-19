import React from 'react';
import { Bookmark, Share2, Clock, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceLogo?: string | null;
  imageUrl: string;
  publishedAt: string;
  topics: string[];
  readTime: string;
  trending?: boolean;
  sourceUrl?: string;
  audioUrl?: string | null;
  region?: string;
  titleOriginal?: string | null;
}

interface NewsCardProps {
  news: NewsItem;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
  onClick: (news: NewsItem) => void;
  isSaved?: boolean;
}

const getRegionBadge = (region?: string) => {
  switch (region) {
    case 'USA':
      return { flag: '🇺🇸', label: 'EUA' };
    case 'Europe':
      return { flag: '🇪🇺', label: 'Europa' };
    case 'Middle East':
      return { flag: '🌍', label: 'Oriente Médio' };
    case 'Brazil':
    default:
      return null; // Don't show badge for Brazilian news (default)
  }
};

const NewsCard: React.FC<NewsCardProps> = ({ news, onSave, onShare, onClick, isSaved = false }) => {
  const regionBadge = getRegionBadge(news.region);

  return (
    <article 
      className="news-card overflow-hidden cursor-pointer group"
      onClick={() => onClick(news)}
    >
      {/* Image Section */}
      <div className="relative aspect-[16/9] sm:aspect-[2/1] md:aspect-[16/10] overflow-hidden">
        <img
          src={news.imageUrl}
          alt={news.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Trending Badge */}
        {news.trending && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3 h-3" />
            Em Alta
          </div>
        )}

        {/* Region Badge - only for international news */}
        {regionBadge && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-foreground">
            <span>{regionBadge.flag}</span>
            <span>{regionBadge.label}</span>
          </div>
        )}
        
        {/* Source Badge with Logo */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-card/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md">
          {news.sourceLogo ? (
            <img 
              src={news.sourceLogo} 
              alt={news.source}
              className="w-4 h-4 object-contain rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold text-primary">
              {news.source.charAt(0)}
            </div>
          )}
          <span className="text-xs font-medium text-foreground">{news.source}</span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        {/* Topics */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {news.topics.slice(0, 2).map((topic) => (
            <span
              key={topic}
              className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md"
            >
              {topic}
            </span>
          ))}
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {news.title}
        </h3>
        
        {/* AI Summary */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {news.summary}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{news.readTime}</span>
            <span className="mx-1">•</span>
            <span>{news.publishedAt}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isSaved ? 'text-accent' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSave(news.id);
              }}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onShare(news.id);
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default NewsCard;
