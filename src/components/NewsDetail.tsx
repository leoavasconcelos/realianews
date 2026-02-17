import React, { useState } from 'react';
import { ArrowLeft, Bookmark, Share2, ExternalLink, Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Skeleton } from './ui/skeleton';
import ShareSheet from './ShareSheet';
import type { NewsItem } from './NewsCard';
import { useFullAnalysis } from '@/hooks/useFullAnalysis';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface NewsDetailProps {
  news: NewsItem;
  onBack: () => void;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
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
      return null;
  }
};

const formatDuration = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const NewsDetail: React.FC<NewsDetailProps> = ({ news, onBack, onSave, onShare, isSaved = false }) => {
  const [shareOpen, setShareOpen] = useState(false);
  const { fullAnalysis, isLoading: analysisLoading } = useFullAnalysis(news.id);
  const audio = useAudioPlayer();

  const regionBadge = getRegionBadge(news.region);

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto animate-fade-in">
      {/* Header Image */}
      <div className="relative h-64 sm:h-80">
        <img
          src={news.imageUrl}
          alt={news.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          {regionBadge && (
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium text-white">
              <span>{regionBadge.flag}</span>
              <span>{regionBadge.label}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSave(news.id)}
            className={`bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 ${isSaved ? 'text-accent' : ''}`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShareOpen(true)}
            className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Source */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium">
            {news.source}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 sm:p-6 pb-32">
        {/* Topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          {news.topics.map((topic) => (
            <span
              key={topic}
              className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg"
            >
              {topic}
            </span>
          ))}
        </div>
        
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-4">
          {news.title}
        </h1>
        
        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
          <span>{news.publishedAt}</span>
          <span>•</span>
          <span>{news.readTime}</span>
        </div>
        
        {/* Audio Player */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="default"
              size="icon"
              onClick={() => audio.togglePlay(news.summary)}
              disabled={audio.isLoading}
              className="h-10 w-10 rounded-full"
            >
              {audio.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : audio.isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            
            <div className="flex-1">
              <Slider
                value={[audio.progress]}
                onValueChange={(value) => audio.seek(value[0])}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={audio.cycleSpeed}
              className="text-xs font-semibold min-w-[3rem]"
            >
              {audio.playbackSpeed}x
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5" />
              <span>
                {audio.isLoading
                  ? 'Gerando áudio...'
                  : audio.duration > 0
                    ? `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration)}`
                    : 'Ouvir resumo em áudio'}
              </span>
            </div>
            {audio.error && (
              <span className="text-destructive">{audio.error}</span>
            )}
          </div>
        </div>
        
        {/* AI Summary - Quick overview */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-5 rounded-md bg-gradient-hero flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">IA</span>
            </div>
            <h2 className="font-semibold text-foreground">Resumo Rápido</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">{news.summary}</p>
        </div>

        {/* Full Analysis */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-5 rounded-md bg-gradient-hero flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">✦</span>
            </div>
            <h2 className="font-semibold text-foreground">Análise Completa</h2>
          </div>
          
          {analysisLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[88%]" />
            </div>
          ) : fullAnalysis ? (
            <div className="prose prose-sm max-w-none">
              {fullAnalysis.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Não foi possível gerar a análise. Tente novamente mais tarde.
            </p>
          )}
        </div>
        
        {/* Source Link */}
        <a
          href={news.sourceUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-secondary rounded-xl hover:bg-muted transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Ler matéria original</p>
            <p className="text-xs text-muted-foreground">{news.source}</p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        </a>
      </div>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={news.title}
        summary={news.summary}
        url={news.sourceUrl || window.location.href}
      />
    </div>
  );
};

export default NewsDetail;
