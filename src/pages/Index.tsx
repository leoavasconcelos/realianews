import React, { useState } from 'react';
import FeedHeader from '@/components/FeedHeader';
import BottomNav from '@/components/BottomNav';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import NewsDetail from '@/components/NewsDetail';
import FilterPills from '@/components/FilterPills';
import OnboardingModal from '@/components/OnboardingModal';
import ProfileScreen from '@/components/ProfileScreen';
import PlaceholderScreen from '@/components/PlaceholderScreen';
import { Compass, GraduationCap, Users } from 'lucide-react';
import { toast } from 'sonner';

// Import images
import newsHero1 from '@/assets/news-hero-1.jpg';
import newsHero2 from '@/assets/news-hero-2.jpg';
import newsHero3 from '@/assets/news-hero-3.jpg';
import newsHero4 from '@/assets/news-hero-4.jpg';

const filters = ['Todos', 'Residencial', 'Comercial', 'Investimentos', 'PropTech', 'Financiamento'];

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Mercado imobiliário brasileiro supera expectativas no primeiro trimestre de 2025',
    summary: 'Vendas de imóveis novos crescem 23% em comparação ao mesmo período do ano anterior, impulsionadas por programas habitacionais e queda de juros.',
    source: 'Valor Econômico',
    imageUrl: newsHero1,
    publishedAt: '2h atrás',
    topics: ['Residencial', 'Mercado'],
    readTime: '4 min',
    trending: true,
  },
  {
    id: '2',
    title: 'Novo condomínio de alto padrão em São Paulo redefine conceito de moradia sustentável',
    summary: 'Empreendimento de R$ 800 milhões incorpora tecnologias verdes e espaços compartilhados inovadores, atraindo investidores institucionais.',
    source: 'Estadão',
    imageUrl: newsHero2,
    publishedAt: '4h atrás',
    topics: ['Residencial', 'Sustentabilidade'],
    readTime: '3 min',
  },
  {
    id: '3',
    title: 'Escritórios corporativos voltam a atrair inquilinos após anos de vacância',
    summary: 'Taxa de ocupação em prédios comerciais AAA atinge 78% em São Paulo, maior nível desde a pandemia. Tendência de flexibilização impulsiona demanda.',
    source: 'Exame',
    imageUrl: newsHero3,
    publishedAt: '6h atrás',
    topics: ['Comercial', 'Corporativo'],
    readTime: '5 min',
  },
  {
    id: '4',
    title: 'FIIs de logística registram captação recorde em janeiro',
    summary: 'Fundos imobiliários do segmento logístico captaram R$ 2,3 bilhões no mês, refletindo expansão do e-commerce e nearshoring.',
    source: 'InfoMoney',
    imageUrl: newsHero4,
    publishedAt: '8h atrás',
    topics: ['Investimentos', 'Logística'],
    readTime: '4 min',
    trending: true,
  },
];

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState('atelier');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const handleOnboardingComplete = (interests: string[]) => {
    setUserInterests(interests);
    setShowOnboarding(false);
    if (interests.length > 0) {
      toast.success('Feed personalizado!', {
        description: `Seu feed foi configurado com ${interests.length} interesses.`,
      });
    }
  };

  const handleSaveNews = (id: string) => {
    toast.success('Notícia salva!', {
      description: 'Você pode acessá-la em Perfil > Salvos',
    });
  };

  const handleShareNews = (id: string) => {
    navigator.share?.({
      title: 'REalia',
      text: 'Confira esta notícia do mercado imobiliário',
      url: window.location.href,
    }).catch(() => {
      toast.info('Link copiado!');
    });
  };

  const filteredNews = activeFilter === 'Todos' 
    ? mockNews 
    : mockNews.filter(news => news.topics.some(t => t.toLowerCase().includes(activeFilter.toLowerCase())));

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'atelier':
        return (
          <div className="flex flex-col min-h-screen pb-20">
            <FeedHeader />
            
            {/* Filters */}
            <div className="px-4 py-3 border-b border-border bg-background/50 backdrop-blur-sm sticky top-[57px] z-30">
              <FilterPills
                filters={filters}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>
            
            {/* News Feed */}
            <main className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {filteredNews.map((news, index) => (
                  <div
                    key={news.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <NewsCard
                      news={news}
                      onSave={handleSaveNews}
                      onShare={handleShareNews}
                      onClick={setSelectedNews}
                    />
                  </div>
                ))}
                
                {filteredNews.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma notícia encontrada para este filtro.</p>
                  </div>
                )}
              </div>
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
            <ProfileScreen />
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
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;
