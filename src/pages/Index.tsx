import { useState, useCallback, useEffect } from 'react';
import { Seo } from '@/components/Seo';
import BottomNav from '@/components/BottomNav';
import { NewsItem } from '@/components/NewsCard';
import NewsDetail from '@/components/NewsDetail';
import OnboardingModal from '@/components/OnboardingModal';
import ProfileScreen from '@/components/ProfileScreen';
import PlaceholderScreen from '@/components/PlaceholderScreen';
import ExploreScreen from '@/components/ExploreScreen';
import SavedItemsScreen from '@/components/SavedItemsScreen';
import AuthModal from '@/components/AuthModal';
import PasswordResetModal from '@/components/PasswordResetModal';
import NotificationCenter from '@/components/NotificationCenter';
import ShareSheet from '@/components/ShareSheet';
import ScreenHeader from '@/components/ScreenHeader';
import { GraduationCap, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useNews, useTopics, useSaveNews, useUnsaveNews, useSavedItems, RegionFilter as RegionFilterType, flattenNewsPages } from '@/hooks/useNews';
import { useNotifications } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { MercadoScreen } from '@/pages/screens/MercadoScreen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Index = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('mercado');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeRegion, setActiveRegion] = useState<RegionFilterType>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareNewsItem, setShareNewsItem] = useState<NewsItem | null>(null);

  const {
    user,
    profile,
    authLoading,
    updateProfile,
    updatePassword,
    showOnboarding,
    showAuthModal,
    setShowAuthModal,
    showPasswordReset,
    setShowPasswordReset,
    preferredRegions,
    handleOnboardingComplete,
  } = useAppBootstrap(setActiveRegion);

  const { unreadCount } = useNotifications(user?.id);

  useEffect(() => {
    if (activeTab === 'mercado') {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    }
  }, [activeTab, queryClient]);

  const {
    data: newsPages,
    isLoading: newsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNews(activeFilter, activeRegion, preferredRegions);
  const news = flattenNewsPages(newsPages);
  const { data: topics } = useTopics();
  const { data: savedItems } = useSavedItems(user?.id);
  const saveNewsMutation = useSaveNews();
  const unsaveNewsMutation = useUnsaveNews();

  const filters = ['Todos', ...(topics?.map(t => t.name) || [])];

  const handleSaveNews = async (id: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const isSaved = savedItems?.includes(id);

    try {
      if (isSaved) {
        await unsaveNewsMutation.mutateAsync({ userId: user.id, newsId: id });
        toast.success('Removido dos salvos');
      } else {
        await saveNewsMutation.mutateAsync({ userId: user.id, newsId: id });
        toast.success('Notícia salva!', {
          description: 'Você pode acessá-la em Perfil > Salvos',
        });
      }
    } catch (error) {
      toast.error('Erro ao salvar notícia');
    }
  };

  const handleShareNews = (id: string) => {
    const newsItem = news?.find(n => n.id === id);
    if (newsItem) {
      setShareNewsItem(newsItem);
      setShareSheetOpen(true);
    }
  };

  const handlePullRefresh = useCallback(async () => {
    // resetQueries collapses the infinite query back to page 1 and
    // refetches — a true "refresh" reflecting current DB state.
    await queryClient.resetQueries({ queryKey: ['news'] });
  }, [queryClient]);

  const handleLogoClick = useCallback(async () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await handlePullRefresh();
  }, [handlePullRefresh]);

  const renderContent = () => {
    switch (activeTab) {
      case 'mercado':
        return (
          <MercadoScreen
            userId={user?.id}
            unreadCount={unreadCount}
            onNotificationsClick={() => setNotifCenterOpen(true)}
            activeRegion={activeRegion}
            onRegionChange={setActiveRegion}
            filters={filters}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onPullRefresh={handlePullRefresh}
            newsLoading={newsLoading}
            news={news}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={() => fetchNextPage()}
            onSaveNews={handleSaveNews}
            onShareNews={handleShareNews}
            onSelectNews={setSelectedNews}
            savedItems={savedItems}
          />
        );

      case 'explorar':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <ScreenHeader title="Explorar" />
            <ExploreScreen
              onNewsClick={setSelectedNews}
              onSaveNews={handleSaveNews}
              onShareNews={handleShareNews}
              savedItems={savedItems}
            />
          </div>
        );

      case 'comunidade':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <ScreenHeader title="Comunidade" />
            <PlaceholderScreen
              title="Comunidade"
              description="Conecte-se com outros profissionais do mercado imobiliário. Em desenvolvimento!"
              icon={<Users className="w-10 h-10 text-accent" />}
            />
          </div>
        );

      case 'academia':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <ScreenHeader title="Academia REalia" />
            <PlaceholderScreen
              title="Academia REalia"
              description="Cursos e conteúdos educacionais sobre o mercado imobiliário. Em desenvolvimento!"
              icon={<GraduationCap className="w-10 h-10 text-accent" />}
            />
          </div>
        );

      case 'salvos':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <ScreenHeader title="Salvos" />
            <SavedItemsScreen
              onNewsClick={setSelectedNews}
              onLoginClick={() => setShowAuthModal(true)}
            />
          </div>
        );

      case 'perfil':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <ScreenHeader title="Perfil" />
            <ProfileScreen
              user={user}
              profile={profile}
              onLoginClick={() => setShowAuthModal(true)}
              onNotificationCenterClick={() => setNotifCenterOpen(true)}
              onSavedClick={() => setActiveTab('salvos')}
              updateProfile={updateProfile}
              updatePassword={updatePassword}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Seo
        title="REalia — Inteligência do Mercado Imobiliário"
        description="Notícias personalizadas por IA, resumos inteligentes e análises do setor imobiliário brasileiro."
        path="/"
      />
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          user={user}
          authLoading={authLoading}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showPasswordReset && (
        <PasswordResetModal
          onClose={() => setShowPasswordReset(false)}
          onSuccess={() => setShowPasswordReset(false)}
        />
      )}

      {!showOnboarding && (
        <>
          {renderContent()}

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

          {selectedNews && (
            <NewsDetail
              news={selectedNews}
              onBack={() => setSelectedNews(null)}
              onSave={handleSaveNews}
              onShare={handleShareNews}
              isSaved={savedItems?.includes(selectedNews.id)}
            />
          )}
        </>
      )}

      {shareNewsItem && (
        <ShareSheet
          open={shareSheetOpen}
          onOpenChange={setShareSheetOpen}
          title={shareNewsItem.title}
          summary={shareNewsItem.summary}
          url={shareNewsItem.sourceUrl || window.location.href}
        />
      )}

      <Dialog open={notifCenterOpen} onOpenChange={setNotifCenterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </DialogTitle>
          </DialogHeader>
          {user ? (
            <NotificationCenter userId={user.id} />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Faça login para ver suas notificações.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;