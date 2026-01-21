import React, { useState } from 'react';
import { Button } from './ui/button';
import Logo from './Logo';
import { Check, Building2, Home, Briefcase, TrendingUp, Landmark, Cpu, ArrowRight } from 'lucide-react';

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

interface OnboardingModalProps {
  onComplete: (selectedInterests: string[]) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
    } else {
      onComplete(selectedInterests);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {step === 0 ? (
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
        ) : (
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
      </div>
      
      {/* Footer */}
      <div className="p-6 pb-8">
        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={handleContinue}
          disabled={step === 1 && selectedInterests.length === 0}
        >
          {step === 0 ? (
            <>
              Começar
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              Personalizar Meu Feed
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
        
        {step === 1 && (
          <button
            onClick={() => onComplete([])}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular por agora
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
