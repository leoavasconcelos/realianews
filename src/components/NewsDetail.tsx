import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark, Share2, ExternalLink, Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Skeleton } from './ui/skeleton';
import ShareSheet from './ShareSheet';
import type { NewsItem } from './NewsCard';
import { useFullAnalysis } from '@/hooks/useFullAnalysis';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useMarkNewsRead } from '@/hooks/useNews';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const markRead = useMarkNewsRead();

  useEffect(() => {
    if (user?.id && news.id) {
      markRead.mutate({ userId: user.id, newsId: news.id });
    }
  }, [news.id, user?.id]);

  const regionBadge = getRegionBadge(news.region);

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto animate-fade-in">
      {/* Header Image */}
      <div className="relative h-64 sm:h-80 lg:h-96">
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
      
      {/* Two-column layout container */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-32 lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Content (left, 2/3) */}
        <div className="lg:col-span-2 lg:min-w-0">
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-2">
            {news.title}
          </h1>

          {/* Original (foreign) title — discreet subtitle for international news */}
          {news.titleOriginal && news.titleOriginal !== news.title && (
            <p
              className="text-sm sm:text-base italic text-muted-foreground/80 leading-snug mb-4"
              lang="en"
            >
              {news.titleOriginal}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
            <span>{news.publishedAt}</span>
            <span>•</span>
            <span>{news.readTime}</span>
          </div>

          {/* Audio Player — mobile/tablet only (desktop shows it in sidebar) */}
          <div className="bg-secondary rounded-xl p-4 mb-6 lg:hidden">
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
          
          {/* AI Summary */}
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
          
          {/* Source Link — mobile/tablet only */}
          <a
            href={news.sourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-secondary rounded-xl hover:bg-muted transition-colors lg:hidden"
          >
            <div>
              <p className="text-sm font-medium text-foreground">Ler matéria original</p>
              <p className="text-xs text-muted-foreground">{news.source}</p>
            </div>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </a>
        </div>

        {/* Sidebar (right, 1/3) — desktop only */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Audio Player */}
            <div className="bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Ouvir resumo</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => audio.togglePlay(news.summary)}
                  disabled={audio.isLoading}
                  className="h-10 w-10 rounded-full shrink-0"
                >
                  {audio.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : audio.isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
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
              <div className="text-xs text-muted-foreground">
                {audio.isLoading
                  ? 'Gerando áudio...'
                  : audio.duration > 0
                    ? `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration)}`
                    : 'Toque em play para ouvir'}
                {audio.error && (
                  <div className="text-destructive mt-1">{audio.error}</div>
                )}
              </div>
            </div>

            {/* Metadata card */}
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm text-foreground mb-2">Detalhes</h3>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fonte</span>
                <span className="font-medium text-foreground text-right truncate ml-2">{news.source}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Publicado</span>
                <span className="font-medium text-foreground">{news.publishedAt}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tempo de leitura</span>
                <span className="font-medium text-foreground">{news.readTime}</span>
              </div>
              {regionBadge && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Região</span>
                  <span className="font-medium text-foreground">
                    {regionBadge.flag} {regionBadge.label}
                  </span>
                </div>
              )}
            </div>

            {/* Topics */}
            {news.topics.length > 0 && (
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-3">Tópicos</h3>
                <div className="flex flex-wrap gap-2">
                  {news.topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Link */}
            <a
              href={news.sourceUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gradient-hero text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">Ler matéria original</p>
                <p className="text-xs opacity-90 truncate">{news.source}</p>
              </div>
              <ExternalLink className="w-5 h-5 shrink-0 ml-2" />
            </a>
          </div>
        </aside>
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
