import React from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { useNews, useSavedItems, useSaveNews, useUnsaveNews } from '@/hooks/useNews';
import { useAuth } from '@/hooks/useAuth';
import NewsCard, { NewsItem } from './NewsCard';
import { toast } from 'sonner';

interface SavedItemsScreenProps {
  onNewsClick: (news: NewsItem) => void;
  onLoginClick: () => void;
}

const SavedItemsScreen: React.FC<SavedItemsScreenProps> = ({ onNewsClick, onLoginClick }) => {
  const { user } = useAuth();
  const { data: allNews, isLoading: newsLoading } = useNews();
  const { data: savedItems, isLoading: savedLoading } = useSavedItems(user?.id);
  const saveNewsMutation = useSaveNews();
  const unsaveNewsMutation = useUnsaveNews();

  const savedNews = allNews?.filter(n => savedItems?.includes(n.id)) || [];
  const isLoading = newsLoading || savedLoading;

  const handleSave = async (id: string) => {
    if (!user) return;
    const isSaved = savedItems?.includes(id);
    try {
      if (isSaved) {
        await unsaveNewsMutation.mutateAsync({ userId: user.id, newsId: id });
        toast.success('Removido dos salvos');
      } else {
        await saveNewsMutation.mutateAsync({ userId: user.id, newsId: id });
      }
    } catch {
      toast.error('Erro ao atualizar item');
    }
  };

  const handleShare = async (id: string) => {
    const newsItem = savedNews.find(n => n.id === id);
    try {
      await navigator.share?.({
        title: newsItem?.title || 'REalia',
        text: newsItem?.summary || '',
        url: newsItem?.sourceUrl || window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(newsItem?.sourceUrl || window.location.href);
      toast.info('Link copiado!');
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Faça login para ver seus salvos</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Salve notícias para ler depois e acesse de qualquer dispositivo.
        </p>
        <button onClick={onLoginClick} className="text-primary font-semibold text-sm">
          Entrar ou Cadastrar →
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (savedNews.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Nenhuma notícia salva</h2>
        <p className="text-sm text-muted-foreground">
          Toque no ícone de bookmark em qualquer notícia para salvá-la aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        {savedNews.length} {savedNews.length === 1 ? 'notícia salva' : 'notícias salvas'}
      </p>
      {savedNews.map((item, index) => (
        <div
          key={item.id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <NewsCard
            news={item}
            onSave={handleSave}
            onShare={handleShare}
            onClick={onNewsClick}
            isSaved={true}
          />
        </div>
      ))}
    </div>
  );
};

export default SavedItemsScreen;
