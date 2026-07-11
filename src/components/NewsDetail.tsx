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
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-32 lg:grid lg:grid-cols-3 lg:gap-10">
        {/* Main Content (left, 2/3) */}
        <article className="lg:col-span-2 lg:min-w-0 max-w-[68ch] mx-auto lg:mx-0">
          {/* Kicker — editorial category label */}
          {news.topics[0] && (
            <div className="kicker mb-4">
              {news.topics[0]}
            </div>
          )}

          {/* Title */}
          <h1 className="font-serif text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-semibold text-foreground leading-[1.15] tracking-tight mb-3">
            {news.title}
          </h1>

          {/* Original (foreign) title — discreet subtitle for international news */}
          {news.titleOriginal && news.titleOriginal !== news.title && (
            <p
              className="font-serif text-base sm:text-lg italic text-muted-foreground leading-snug mb-5"
              lang="en"
            >
              {news.titleOriginal}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground mb-8 pb-5 border-b border-border">
            <span>{news.publishedAt}</span>
            <span className="text-border">•</span>
            <span>{news.readTime}</span>
          </div>

          {/* Audio Player — mobile/tablet only (desktop shows it in sidebar) */}
          <div className="bg-secondary/60 rounded-md border border-border p-4 mb-8 lg:hidden">
            <div className="kicker mb-3">Ouvir resumo</div>
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
          <section className="mb-8 pb-8 border-b border-border/70">
            <div className="kicker mb-4">Resumo · IA</div>
            <h2 className="sr-only">Resumo Rápido</h2>
            <p className="font-serif text-lg sm:text-xl text-foreground leading-[1.6] first-letter:font-semibold">
              {news.summary}
            </p>
          </section>

          {/* Full Analysis */}
          <section className="mb-8">
            <div className="kicker mb-4">Análise Completa</div>
            
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
              <div className="max-w-none">
                {fullAnalysis.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-[0.975rem] sm:text-base text-foreground/90 leading-[1.75] mb-5">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Não foi possível gerar a análise. Tente novamente mais tarde.
              </p>
            )}
          </section>
          
          {/* Source Link — mobile/tablet only */}
          <a
            href={news.sourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 mt-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity lg:hidden"
          >
            <div>
              <p className="text-sm font-semibold">Ler matéria original</p>
              <p className="text-xs opacity-90">{news.source}</p>
            </div>
            <ExternalLink className="w-5 h-5" />
          </a>
        </article>

        {/* Sidebar (right, 1/3) — desktop only */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Audio Player */}
            <div className="bg-secondary rounded-lg border border-border p-4">
              <div className="kicker mb-3">Ouvir resumo</div>
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
            <div className="bg-secondary rounded-lg border border-border p-4 space-y-3">
              <div className="kicker mb-1">Detalhes</div>
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
              <div className="bg-secondary rounded-lg border border-border p-4">
                <div className="kicker mb-3">Tópicos</div>
                <div className="flex flex-wrap gap-2">
                  {news.topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-xs font-medium text-primary bg-primary/10 border border-primary/15 px-2.5 py-1 rounded-md"
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
              className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
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
