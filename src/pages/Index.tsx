import React, { useState } from 'react';
import FeedHeader from '@/components/FeedHeader';
import BottomNav from '@/components/BottomNav';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import NewsDetail from '@/components/NewsDetail';
import FilterPills from '@/components/FilterPills';
import RegionFilter from '@/components/RegionFilter';
import OnboardingModal from '@/components/OnboardingModal';
import ProfileScreen from '@/components/ProfileScreen';
import PlaceholderScreen from '@/components/PlaceholderScreen';
import AuthModal from '@/components/AuthModal';
import { Compass, GraduationCap, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNews, useTopics, useSaveNews, useUnsaveNews, useSavedItems, RegionFilter as RegionFilterType } from '@/hooks/useNews';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('realia_onboarding_complete');
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('atelier');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeRegion, setActiveRegion] = useState<RegionFilterType>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const { user, profile, updateProfile } = useAuth();
  const { data: news, isLoading: newsLoading } = useNews(activeFilter, activeRegion);
  const { data: topics } = useTopics();
  const { data: savedItems } = useSavedItems(user?.id);
  const saveNewsMutation = useSaveNews();
  const unsaveNewsMutation = useUnsaveNews();

  const filters = ['Todos', ...(topics?.map(t => t.name) || [])];

  const handleOnboardingComplete = async (interests: string[]) => {
    localStorage.setItem('realia_onboarding_complete', 'true');
    setShowOnboarding(false);
    
    if (interests.length > 0) {
      if (user) {
        await updateProfile({ interests });
      }
      toast.success('Feed personalizado!', {
        description: `Seu feed foi configurado com ${interests.length} interesses.`,
      });
    }
  };

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

  const handleShareNews = async (id: string) => {
    const newsItem = news?.find(n => n.id === id);
    try {
      await navigator.share?.({
        title: newsItem?.title || 'REalia',
        text: newsItem?.summary || 'Confira esta notícia do mercado imobiliário',
        url: newsItem?.sourceUrl || window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(newsItem?.sourceUrl || window.location.href);
      toast.info('Link copiado!');
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'atelier':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <FeedHeader />
            
            {/* Filters */}
            <div className="px-4 py-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-[57px] z-30">
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                  <FilterPills
                    filters={filters}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </div>
                <RegionFilter 
                  activeRegion={activeRegion} 
                  onRegionChange={setActiveRegion} 
                />
              </div>
            </div>
            
            {/* News Feed */}
            <main className="flex-1 px-4 py-4">
              {newsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {news?.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <NewsCard
                        news={item}
                        onSave={handleSaveNews}
                        onShare={handleShareNews}
                        onClick={setSelectedNews}
                        isSaved={savedItems?.includes(item.id)}
                      />
                    </div>
                  ))}
                  
                  {(!news || news.length === 0) && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Nenhuma notícia encontrada para este filtro.</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        );
      
      case 'explorar':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
              <h1 className="text-xl font-bold text-foreground">Explorar</h1>
            </header>
            <PlaceholderScreen
              title="Explorar"
              description="Descubra novas fontes, tópicos e tendências do mercado imobiliário. Em breve!"
              icon={<Compass className="w-10 h-10 text-primary" />}
            />
          </div>
        );
      
      case 'academia':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
              <h1 className="text-xl font-bold text-foreground">Academia REalia</h1>
            </header>
            <PlaceholderScreen
              title="Academia REalia"
              description="Cursos e conteúdos educacionais sobre o mercado imobiliário. Em desenvolvimento!"
              icon={<GraduationCap className="w-10 h-10 text-accent" />}
            />
          </div>
        );
      
      case 'comunidade':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
              <h1 className="text-xl font-bold text-foreground">Comunidade</h1>
            </header>
            <PlaceholderScreen
              title="Comunidade"
              description="Conecte-se com profissionais e entusiastas do mercado imobiliário. Em breve!"
              icon={<Users className="w-10 h-10 text-teal" />}
            />
          </div>
        );
      
      case 'perfil':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
              <h1 className="text-xl font-bold text-foreground">Perfil</h1>
            </header>
            <ProfileScreen 
              user={user} 
              profile={profile} 
              onLoginClick={() => setShowAuthModal(true)} 
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {/* Main Content */}
      {!showOnboarding && (
        <>
          {renderContent()}
          
          {/* Bottom Navigation */}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* News Detail Modal */}
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
    </div>
  );
};

export default Index;
