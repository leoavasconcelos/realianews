import React, { useState } from 'react';
import { Button } from './ui/button';
import Logo from './Logo';
import AuthModalContent from './AuthModalContent';
import { Check, Building2, Home, Briefcase, TrendingUp, Landmark, Cpu, ArrowRight, Globe, ArrowLeft } from 'lucide-react';

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
  { id: 'proptech', label: 'PropTech', icon: <Cpu className="w-5 h-5" />, description: 'Tecnologia e inovação' },
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

interface OnboardingModalProps {
  onComplete: (selectedInterests: string[], preferredRegions: string[]) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestedInInternational, setInterestedInInternational] = useState<boolean | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

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
      // Final step - complete onboarding
      const finalRegions = interestedInInternational ? ['Brazil', ...selectedRegions] : ['Brazil'];
      onComplete(selectedInterests, finalRegions);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleAuthSuccess = () => {
    // Move to next step after successful auth
    setStep(2);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome step
      case 1: return true; // Auth step (can skip)
      case 2: return selectedInterests.length > 0; // Interests step
      case 3: return interestedInInternational !== null && 
                     (!interestedInInternational || selectedRegions.length > 0); // Regions step
      default: return false;
    }
  };

  const renderStepIndicator = () => {
    if (step === 0) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s <= step ? 'w-8 bg-primary' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header with back button */}
      {step > 0 && step !== 1 && (
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
        
        {step === 0 && (
          // Welcome Step
          <div className="text-center animate-fade-in max-w-md">
            <div className="mb-8">
              <Logo size="xl" showText={false} className="justify-center mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Bem-vindo ao REalia
              </h1>
              <p className="text-lg text-muted-foreground">
                A inteligência do mercado imobiliário
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-left p-4 bg-secondary rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Feed Personalizado</h3>
                  <p className="text-sm text-muted-foreground">Notícias curadas por IA para você</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left p-4 bg-secondary rounded-xl">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Resumos Inteligentes</h3>
                  <p className="text-sm text-muted-foreground">Entenda tudo em segundos</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {step === 1 && (
          // Auth Step
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
          // Interests Step
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
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-muted-foreground/30'
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
          // International Preferences Step
          <div className="w-full max-w-md animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Notícias Internacionais
              </h2>
              <p className="text-muted-foreground">
                Deseja acompanhar mercados imobiliários globais?
              </p>
            </div>
            
            {/* Yes/No Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setInterestedInInternational(true)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  interestedInInternational === true
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
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
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <span className="text-2xl mb-2 block">🇧🇷</span>
                <h3 className="font-semibold text-foreground">Não, apenas Brasil</h3>
              </button>
            </div>
            
            {/* Region Selection (only if interested in international) */}
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
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-muted-foreground/30'
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
            className="w-full"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {step === 0 ? (
              <>
                Começar
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : step === 3 ? (
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
  );
};

export default OnboardingModal;
