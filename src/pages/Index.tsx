import React, { useState, useEffect, useMemo, useRef } from 'react';
import FeedHeader from '@/components/FeedHeader';
import BottomNav from '@/components/BottomNav';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import NewsDetail from '@/components/NewsDetail';
import FilterPills from '@/components/FilterPills';
import RegionFilter from '@/components/RegionFilter';
import OnboardingModal from '@/components/OnboardingModal';
import ProfileScreen from '@/components/ProfileScreen';
import PlaceholderScreen from '@/components/PlaceholderScreen';
import ExploreScreen from '@/components/ExploreScreen';
import AuthModal from '@/components/AuthModal';
import PasswordResetModal from '@/components/PasswordResetModal';
import { Compass, GraduationCap, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNews, useTopics, useSaveNews, useUnsaveNews, useSavedItems, RegionFilter as RegionFilterType } from '@/hooks/useNews';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [activeTab, setActiveTab] = useState('mercado');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeRegion, setActiveRegion] = useState<RegionFilterType>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const { user, profile, loading: authLoading, authLoading: rawAuthLoading, updateProfile } = useAuth();

  // Determine onboarding visibility based on localStorage + profile data
  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve
    
    const localStorageComplete = localStorage.getItem('realia_onboarding_complete');
    
    if (localStorageComplete) {
      setShowOnboarding(false);
      return;
    }
    
    // No localStorage flag - check if user has interests saved in DB
    if (user && profile) {
      // Profile loaded: check interests
      if (profile.interests && profile.interests.length > 0) {
        // User already completed onboarding before, mark localStorage and skip
        localStorage.setItem('realia_onboarding_complete', 'true');
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } else if (!user) {
      // No user, no localStorage flag → show onboarding
      setShowOnboarding(true);
    }
    // If user exists but profile is still null (loading), wait
  }, [authLoading, user, profile]);

  // Auto-close auth modal when user is authenticated
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [user, showAuthModal]);

  // Synchronous localStorage read - stable across hot reloads
  const getStoredRegions = (): string[] | null => {
    try {
      const stored = localStorage.getItem('realia_preferred_regions');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Ref initialized synchronously (not in useEffect) to avoid HMR issues
  const storedRegionsRef = useRef<string[] | null>(getStoredRegions());
  const regionInitializedRef = useRef(false);

  // Get preferred regions - stable value that never returns undefined
  const preferredRegions = useMemo(() => {
    if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
      return profile.preferred_regions;
    }
    // Always return a valid array, never undefined
    return storedRegionsRef.current || ['Brazil'];
  }, [profile?.preferred_regions]);

  // Initialize region filter from user preferences - runs once when auth finishes loading
  useEffect(() => {
    if (authLoading) return;
    if (regionInitializedRef.current) return;
    
    regionInitializedRef.current = true;
    
    // Apply filter based on preferences - only set specific region if exactly one selected
    if (preferredRegions.length === 1) {
      setActiveRegion(preferredRegions[0] as RegionFilterType);
    }
  }, [authLoading, preferredRegions]);

  // Detect password recovery event from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // Also check URL for reset parameter (fallback)
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      // Wait a bit for Supabase to process the token
      setTimeout(() => {
        setShowPasswordReset(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    }

    return () => subscription.unsubscribe();
  }, []);

  // preferredRegions is now defined above with synchronous initialization

  const { data: news, isLoading: newsLoading } = useNews(activeFilter, activeRegion, preferredRegions);
  const { data: topics } = useTopics();
  const { data: savedItems } = useSavedItems(user?.id);
  const saveNewsMutation = useSaveNews();
  const unsaveNewsMutation = useUnsaveNews();

  const filters = ['Todos', ...(topics?.map(t => t.name) || [])];

  const handleOnboardingComplete = async (interests: string[], preferredRegions: string[]) => {
    localStorage.setItem('realia_onboarding_complete', 'true');
    setShowOnboarding(false);
    
    // Store preferred regions in localStorage for unauthenticated users
    localStorage.setItem('realia_preferred_regions', JSON.stringify(preferredRegions));
    
    if (user) {
      await updateProfile({ interests, preferred_regions: preferredRegions });
      toast.success('Feed personalizado!', {
        description: `Seu feed foi configurado com ${interests.length} interesses.`,
      });
    } else if (interests.length > 0) {
      // Store interests in localStorage for later sync
      localStorage.setItem('realia_interests', JSON.stringify(interests));
      toast.success('Preferências salvas!', {
        description: 'Faça login para sincronizar suas preferências.',
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
      case 'mercado':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <FeedHeader />
            
            {/* Filters */}
            <div className="px-4 py-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-[57px] z-30 space-y-2">
              <RegionFilter 
                activeRegion={activeRegion} 
                onRegionChange={setActiveRegion}
                activeFilter={activeFilter}
              />
              <FilterPills
                filters={filters}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
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
            <ExploreScreen
              onNewsClick={setSelectedNews}
              onSaveNews={handleSaveNews}
              onShareNews={handleShareNews}
              savedItems={savedItems}
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
              updateProfile={updateProfile}
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
        <OnboardingModal 
          onComplete={handleOnboardingComplete} 
          user={user} 
          authLoading={rawAuthLoading} 
        />
      )}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <PasswordResetModal
          onClose={() => setShowPasswordReset(false)}
          onSuccess={() => setShowPasswordReset(false)}
        />
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
