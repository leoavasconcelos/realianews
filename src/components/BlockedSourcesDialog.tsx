import React, { useState, useEffect } from 'react';
import { Shield, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Source {
  id: string;
  name: string;
  logo_url: string | null;
}

interface BlockedSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedSources: string[];
  updateProfile: (updates: { blocked_sources: string[] }) => Promise<{ error: Error | null }>;
}

const BlockedSourcesDialog: React.FC<BlockedSourcesDialogProps> = ({
  open, onOpenChange, blockedSources, updateProfile,
}) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(blockedSources || []);
      setLoading(true);
      supabase
        .from('sources')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .then(({ data }) => {
          setSources(data || []);
          setLoading(false);
        });
    }
  }, [open, blockedSources]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ blocked_sources: selected });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar fontes bloqueadas');
    } else {
      toast.success('Fontes bloqueadas atualizadas!');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Fontes Bloqueadas
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione as fontes que você deseja bloquear. Notícias dessas fontes não aparecerão no seu feed.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma fonte disponível.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggle(source.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                    selected.includes(source.id)
                      ? 'border-destructive bg-destructive/5'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={source.logo_url || undefined} alt={source.name} />
                    <AvatarFallback className="text-xs bg-muted">
                      {source.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left font-medium text-foreground text-sm">
                    {source.name}
                  </span>
                  {selected.includes(source.id) && (
                    <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                      <Check className="w-3 h-3 text-destructive-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="hero" className="flex-1" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockedSourcesDialog;
