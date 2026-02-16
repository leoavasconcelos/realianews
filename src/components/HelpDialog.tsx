import React from 'react';
import { HelpCircle, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import Logo from './Logo';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const faqItems = [
  {
    q: 'Como salvar notícias para ler depois?',
    a: 'Toque no ícone de bookmark em qualquer notícia para salvá-la. Acesse seus itens salvos pelo menu "Salvos" no perfil.',
  },
  {
    q: 'Como alterar minhas preferências de notícias?',
    a: 'Acesse seu perfil e toque em "Meus Interesses" para selecionar tópicos ou "Regiões de Interesse" para escolher quais regiões acompanhar.',
  },
  {
    q: 'O que são as fontes bloqueadas?',
    a: 'Você pode bloquear fontes de notícias específicas para que elas não apareçam no seu feed. Acesse "Fontes Bloqueadas" no perfil.',
  },
  {
    q: 'Como ativar notificações?',
    a: 'Vá até "Notificações" no perfil e ative as notificações por e-mail ou push para receber alertas sobre novas notícias.',
  },
  {
    q: 'O aplicativo é gratuito?',
    a: 'Sim! O REalia é gratuito e oferece acesso completo a todas as notícias e funcionalidades do mercado imobiliário.',
  },
];

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Ajuda e Suporte
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* FAQ */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Perguntas Frequentes</h3>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Contato</h3>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('mailto:suporte@realia.com.br', '_blank')}
            >
              <Mail className="w-4 h-4 mr-2" />
              suporte@realia.com.br
            </Button>
          </div>

          {/* Version */}
          <div className="text-center pt-4 border-t border-border">
            <Logo size="sm" className="justify-center mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Versão 1.0.0</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
