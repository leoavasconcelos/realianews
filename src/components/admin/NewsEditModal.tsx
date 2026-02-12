import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const REGIONS = ['Brazil', 'USA', 'Europe', 'Asia', 'Middle East', 'World'];

interface NewsEditModalProps {
  newsId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewsFormData {
  title: string;
  summary_ai: string;
  full_text: string;
  source_url: string;
  image_url: string;
  region: string;
  read_time: string;
  is_trending: boolean;
  source_id: string | null;
  topics: string[];
}

export const NewsEditModal = ({ newsId, open, onOpenChange }: NewsEditModalProps) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewsFormData>({
    title: '',
    summary_ai: '',
    full_text: '',
    source_url: '',
    image_url: '',
    region: 'Brazil',
    read_time: '3 min',
    is_trending: false,
    source_id: null,
    topics: [],
  });
  const [newTopic, setNewTopic] = useState('');

  const { data: newsItem, isLoading: loadingNews } = useQuery({
    queryKey: ['admin-news-detail', newsId],
    queryFn: async () => {
      if (!newsId) return null;
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!newsId && open,
  });

  const { data: sources } = useQuery({
    queryKey: ['admin-sources-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (newsItem) {
      const topics = Array.isArray(newsItem.topics) ? newsItem.topics as string[] : [];
      setForm({
        title: newsItem.title || '',
        summary_ai: newsItem.summary_ai || '',
        full_text: newsItem.full_text || '',
        source_url: newsItem.source_url || '',
        image_url: newsItem.image_url || '',
        region: newsItem.region || 'Brazil',
        read_time: newsItem.read_time || '3 min',
        is_trending: newsItem.is_trending || false,
        source_id: newsItem.source_id || null,
        topics,
      });
    }
  }, [newsItem]);

  const updateMutation = useMutation({
    mutationFn: async (data: NewsFormData) => {
      if (!newsId) throw new Error('No news ID');
      const { error } = await supabase
        .from('news')
        .update({
          title: data.title,
          summary_ai: data.summary_ai || null,
          full_text: data.full_text || null,
          source_url: data.source_url,
          image_url: data.image_url || null,
          region: data.region,
          read_time: data.read_time || null,
          is_trending: data.is_trending,
          source_id: data.source_id,
          topics: data.topics,
        })
        .eq('id', newsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      toast.success('Notícia atualizada com sucesso');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.source_url.trim()) {
      toast.error('Título e URL da fonte são obrigatórios');
      return;
    }
    updateMutation.mutate(form);
  };

  const addTopic = () => {
    const trimmed = newTopic.trim();
    if (trimmed && !form.topics.includes(trimmed)) {
      setForm(prev => ({ ...prev, topics: [...prev.topics, trimmed] }));
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setForm(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Notícia</DialogTitle>
        </DialogHeader>

        {loadingNews ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da notícia"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Resumo IA</Label>
              <Textarea
                id="summary"
                value={form.summary_ai}
                onChange={e => setForm(prev => ({ ...prev, summary_ai: e.target.value }))}
                placeholder="Resumo gerado por IA"
                rows={3}
              />
            </div>

            {/* Full Text */}
            <div className="space-y-2">
              <Label htmlFor="full_text">Texto Completo</Label>
              <Textarea
                id="full_text"
                value={form.full_text}
                onChange={e => setForm(prev => ({ ...prev, full_text: e.target.value }))}
                placeholder="Conteúdo completo da notícia"
                rows={6}
              />
            </div>

            {/* URLs row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_url">URL da Fonte *</Label>
                <Input
                  id="source_url"
                  value={form.source_url}
                  onChange={e => setForm(prev => ({ ...prev, source_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Region, Source, Read Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Região</Label>
                <Select value={form.region} onValueChange={v => setForm(prev => ({ ...prev, region: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Select
                  value={form.source_id || 'none'}
                  onValueChange={v => setForm(prev => ({ ...prev, source_id: v === 'none' ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {sources?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="read_time">Tempo de Leitura</Label>
                <Input
                  id="read_time"
                  value={form.read_time}
                  onChange={e => setForm(prev => ({ ...prev, read_time: e.target.value }))}
                  placeholder="3 min"
                />
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label>Tópicos</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.topics.map(topic => (
                  <Badge key={topic} variant="secondary" className="gap-1">
                    {topic}
                    <button type="button" onClick={() => removeTopic(topic)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="Adicionar tópico"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTopic}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Trending toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_trending}
                onCheckedChange={v => setForm(prev => ({ ...prev, is_trending: v }))}
              />
              <Label>Marcar como Trending</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
