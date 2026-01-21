import React from 'react';
import { Bookmark, Share2, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  publishedAt: string;
  topics: string[];
  readTime: string;
  trending?: boolean;
}

interface NewsCardProps {
  news: NewsItem;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
  onClick: (news: NewsItem) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ news, onSave, onShare, onClick }) => {
  return (
    <article 
      className="news-card overflow-hidden cursor-pointer group"
      onClick={() => onClick(news)}
    >
      {/* Image Section */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={news.imageUrl}
          alt={news.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Trending Badge */}
        {news.trending && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3 h-3" />
            Em Alta
          </div>
        )}
        
        {/* Source Badge */}
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium text-foreground">
          {news.source}
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
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onSave(news.id);
              }}
            >
              <Bookmark className="w-4 h-4" />
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
