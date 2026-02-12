import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import Logo from './Logo';
import AuthModalContent from './AuthModalContent';
import { Check, Building2, Home, Briefcase, TrendingUp, Landmark, Cpu, ArrowRight, Globe, ArrowLeft, Brain, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Interest {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const interests: Interest[] = [
  { id: 'residencial', label: 'Residencial', icon: <Home className="w-5 h-5" />, description: 'Casas, apartamentos e lançamentos' },
  { id: 'comercial', label: 'Comercial', icon: <Building2 className="w-5 h-5" />, description: 'Escritórios, lojas e galpões' },
  { id: 'corporativo', label: 'Corporativo', icon: <Briefcase className="w-5 h-5" />, description: 'M&A, fundos e grandes players' },
  { id: 'financiamento', label: 'Financiamento', icon: <Landmark className="w-5 h-5" />, description: 'Crédito, taxas e bancos' },
  { id: 'investimentos', label: 'Investimentos', icon: <TrendingUp className="w-5 h-5" />, description: 'FIIs, CRIs e oportunidades' },
  { id: 'proptech', label: 'PropTech', icon: <Cpu className="w-5 h-5" />, description: 'Startups e inovação digital' },
  { id: 'ia-imobiliaria', label: 'IA Imobiliária', icon: <Brain className="w-5 h-5" />, description: 'Machine learning e automação' },
];

interface Region {
  id: string;
  label: string;
  description: string;
  flag: string;
}

const internationalRegions: Region[] = [
  { id: 'USA', label: 'EUA', description: 'Estados Unidos', flag: '🇺🇸' },
  { id: 'Europe', label: 'Europa', description: 'Reino Unido, Alemanha, França...', flag: '🇪🇺' },
  { id: 'Middle East', label: 'Oriente Médio', description: 'Dubai, Arábia Saudita...', flag: '🇦🇪' },
  { id: 'World', label: 'Mundo', description: 'Ásia, Oceania, consultorias globais', flag: '🌍' },
];

const STORAGE_KEYS = {
  step: 'realia_onboarding_step',
  interests: 'realia_onboarding_interests',
  regions: 'realia_onboarding_regions',
  international: 'realia_onboarding_international',
};

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const clearOnboardingStorage = () => {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
};

interface OnboardingModalProps {
  onComplete: (selectedInterests: string[], preferredRegions: string[]) => void;
  user?: User | null;
  authLoading?: boolean;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, user, authLoading }) => {
  const [step, setStep] = useState(() => readStorage(STORAGE_KEYS.step, 0));
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => readStorage(STORAGE_KEYS.interests, []));
  const [interestedInInternational, setInterestedInInternational] = useState<boolean | null>(() => readStorage(STORAGE_KEYS.international, null));
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => readStorage(STORAGE_KEYS.regions, []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.step, JSON.stringify(step));
  }, [step]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.interests, JSON.stringify(selectedInterests));
  }, [selectedInterests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.regions, JSON.stringify(selectedRegions));
  }, [selectedRegions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.international, JSON.stringify(interestedInInternational));
  }, [interestedInInternational]);

  useEffect(() => {
    if (!authLoading && user && step === 1) {
      setStep(2);
    }
  }, [authLoading, user, step]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      const finalRegions = interestedInInternational ? ['Brazil', ...selectedRegions] : ['Brazil'];
      clearOnboardingStorage();
      onComplete(selectedInterests, finalRegions);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      if (step === 2 && user) {
        setStep(0);
      } else {
        setStep(step - 1);
      }
    }
  };

  const handleAuthSuccess = () => {
    setStep(2);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return true;
      case 2: return selectedInterests.length > 0;
      case 3: return interestedInInternational !== null && 
                     (!interestedInInternational || selectedRegions.length > 0);
      default: return false;
    }
  };

  // Loading screen with premium feel
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
        <Logo size="xl" showText={false} className="justify-center mb-6" />
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const renderStepIndicator = () => {
    if (step === 0) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s <= step ? 'w-8 bg-gradient-hero' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Step 0: Premium welcome with hero gradient */}
      {step === 0 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          {/* Hero gradient top section */}
          <div className="relative bg-gradient-hero pt-16 pb-20 px-6 flex flex-col items-center">
            {/* Metallic shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.03] to-transparent pointer-events-none" />
            
            {/* Logo */}
            <div className="relative mb-6">
              <div className="w-20 h-20 relative">
                <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                    <path d="M8 32V16L20 8L32 16V32H24V24H16V32H8Z" fill="white" fillOpacity="0.95" />
                    <path d="M18 18H22V22H18V18Z" fill="hsl(213 52% 24%)" />
                    <path d="M8 16L20 8L32 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                  </svg>
                </div>
                {/* Glow effect */}
                <div className="absolute -inset-3 rounded-3xl bg-white/5 blur-xl pointer-events-none" />
              </div>
            </div>
            
            {/* Brand name */}
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">
              REalia
            </h1>
            <p className="text-sm font-medium text-white/70 tracking-[0.25em] uppercase mb-2">
              Inteligência Imobiliária
            </p>
          </div>
          
          {/* Curved transition */}
          <div className="relative -mt-6">
            <div className="absolute inset-x-0 -top-6 h-12 bg-background rounded-t-3xl" />
          </div>
          
          {/* Feature cards section */}
          <div className="flex-1 bg-background px-6 pb-6 flex flex-col justify-center -mt-2">
            <p className="text-center text-muted-foreground mb-6 text-sm">
              Tudo que você precisa para dominar o mercado
            </p>
            
            <div className="space-y-3 max-w-md mx-auto w-full">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-hero flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Feed Personalizado</h3>
                  <p className="text-xs text-muted-foreground">Notícias curadas por IA para o seu perfil</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Resumos Inteligentes</h3>
                  <p className="text-xs text-muted-foreground">Entenda tudo em segundos com IA</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(173 58% 39%), hsl(173 58% 50%))' }}>
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Cobertura Global</h3>
                  <p className="text-xs text-muted-foreground">Mercados internacionais em português</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="px-6 pb-8 bg-background">
            <Button
              variant="hero"
              size="xl"
              className="w-full shadow-lg"
              onClick={handleNext}
            >
              Começar
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Steps 1-3 with accent line */}
      {step > 0 && (
        <div className="flex-1 flex flex-col bg-background">
          {/* Accent gradient line at top */}
          <div className="accent-line" />
          
          {/* Header with back button */}
          {step !== 1 && (
            <div className="p-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
            {renderStepIndicator()}
            
            {step === 1 && (
              <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-6">
                  <Logo size="lg" showText={false} className="justify-center mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Entre ou crie sua conta
                  </h2>
                  <p className="text-muted-foreground">
                    Salve notícias e sincronize suas preferências
                  </p>
                </div>
                
                <AuthModalContent 
                  inline 
                  onSuccess={handleAuthSuccess} 
                />
              </div>
            )}
            
            {step === 2 && (
              <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Quais são seus interesses?
                  </h2>
                  <p className="text-muted-foreground">
                    Selecione pelo menos um tema para personalizar seu feed
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {interests.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedInterests.includes(interest.id)
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-card-hover'
                      }`}
                    >
                      {selectedInterests.includes(interest.id) && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`mb-2 ${selectedInterests.includes(interest.id) ? 'text-primary' : 'text-muted-foreground'}`}>
                        {interest.icon}
                      </div>
                      <h3 className="font-semibold text-foreground text-sm mb-0.5">
                        {interest.label}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {interest.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Notícias Internacionais
                  </h2>
                  <p className="text-muted-foreground">
                    Deseja acompanhar mercados imobiliários globais?
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setInterestedInInternational(true)}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      interestedInInternational === true
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-card-hover'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">🌍</span>
                    <h3 className="font-semibold text-foreground">Sim, me interessa</h3>
                  </button>
                  
                  <button
                    onClick={() => {
                      setInterestedInInternational(false);
                      setSelectedRegions([]);
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      interestedInInternational === false
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-card-hover'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">🇧🇷</span>
                    <h3 className="font-semibold text-foreground">Não, apenas Brasil</h3>
                  </button>
                </div>
                
                {interestedInInternational && (
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
                      Quais regiões?
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {internationalRegions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => toggleRegion(region.id)}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                            selectedRegions.includes(region.id)
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-card-hover'
                          }`}
                        >
                          {selectedRegions.includes(region.id) && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-2xl mb-2 block">{region.flag}</span>
                          <h3 className="font-semibold text-foreground text-sm mb-0.5">
                            {region.label}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {region.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {step !== 1 && (
            <div className="p-6 pb-8">
              <Button
                variant="hero"
                size="xl"
                className="w-full shadow-lg"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {step === 3 ? (
                  <>
                    Personalizar Meu Feed
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardingModal;
