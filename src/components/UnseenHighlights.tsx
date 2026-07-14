import { useUnseenHighlights, useMarkNewsRead } from '@/hooks/useNews';
import type { NewsItem } from '@/components/NewsCard';

interface UnseenHighlightsProps {
  userId?: string;
  onSelectNews: (news: NewsItem) => void;
}

const UnseenHighlights = ({ userId, onSelectNews }: UnseenHighlightsProps) => {
  const { data: highlights } = useUnseenHighlights(userId);
  const markRead = useMarkNewsRead();

  if (!userId || !highlights || highlights.length === 0) return null;

  const handleOpen = (item: NewsItem) => {
    markRead.mutate({ userId, newsId: item.id });
    onSelectNews(item);
  };

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Você ainda não viu
      </h2>
      <div className="flex flex-col gap-2">
        {highlights.map((item) => (
          <button
            key={item.id}
            onClick={() => handleOpen(item)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card text-left transition-colors hover:border-accent/40"
          >
            <img
              src={item.imageUrl}
              alt=""
              className="w-14 h-14 rounded-md object-cover flex-shrink-0"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground line-clamp-2">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.source} · {item.publishedAt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default UnseenHighlights;
