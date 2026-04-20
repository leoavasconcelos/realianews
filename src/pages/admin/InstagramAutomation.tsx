import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, ExternalLink, Image as ImageIcon, Instagram, Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstagramSettingsRow {
  id: string;
  webhook_url: string | null;
  enabled: boolean;
  schedule_hour: number;
  top_n: number;
  updated_at: string;
}

interface InstagramPublicationRow {
  id: string;
  status: 'pending' | 'preview' | 'sent' | 'failed';
  caption: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  news_ids: string[] | null;
  slides_urls: string[] | null;
}

interface PreviewResponse {
  publicationId: string;
  caption: string;
  slides: string[];
  news: Array<{
    id: string;
    title: string;
    source: string;
    topics: string[];
  }>;
}

export const InstagramAutomation = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [topN, setTopN] = useState('5');
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['instagram-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as InstagramSettingsRow;
    },
  });

  const { data: publications, isLoading: publicationsLoading } = useQuery({
    queryKey: ['instagram-publications'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_publications')
        .select('id, status, caption, error, sent_at, created_at, news_ids, slides_urls')
        .order('created_at', { ascending: false })
        .limit(7);
      if (error) throw error;
      return (data || []) as InstagramPublicationRow[];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setWebhookUrl(settings.webhook_url || '');
    setEnabled(settings.enabled);
    setTopN(String(settings.top_n || 5));
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const numericTopN = Math.min(8, Math.max(1, Number(topN) || 5));
      const payload = {
        webhook_url: webhookUrl.trim() || null,
        enabled,
        top_n: numericTopN,
      };

      const { error } = await (supabase as any)
        .from('instagram_settings')
        .update(payload)
        .eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-settings'] });
      toast.success('Configuração do Instagram salva');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('publish-instagram-digest', {
        body: { mode: 'preview', topN: Math.min(8, Math.max(1, Number(topN) || 5)) },
      });
      if (error) throw error;
      return data as PreviewResponse;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success('Preview gerado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar preview: ${error.message}`);
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('publish-instagram-digest', {
        body: { mode: 'send', topN: Math.min(8, Math.max(1, Number(topN) || 5)) },
      });
      if (error) throw error;
      return data as PreviewResponse;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success('Digest enviado para o Zapier');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao disparar digest: ${error.message}`);
    },
  });

  const latestStatus = publications?.[0]?.status;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instagram</h1>
          <p className="text-muted-foreground mt-1">
            Carrossel diário com as melhores notícias das últimas 24 horas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {latestStatus && (
            <Badge variant={latestStatus === 'sent' ? 'default' : latestStatus === 'failed' ? 'destructive' : 'secondary'}>
              Último status: {latestStatus}
            </Badge>
          )}
          <Badge variant="outline">09:00 BRT</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Instagram className="h-5 w-5 text-primary" />
              Automação diária
            </CardTitle>
            <CardDescription>
              Configure o webhook do Zapier, o número de notícias e rode testes manuais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Webhook do Zapier</label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  disabled={!isAdmin || saveSettings.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, o backend usa o secret seguro configurado no projeto.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Top notícias do dia</label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={topN}
                  onChange={(e) => setTopN(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de 8 notícias por digest para caber no carrossel.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Envio automático diário</p>
                <p className="text-sm text-muted-foreground">Ativa o disparo recorrente às 09:00 BRT.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{enabled ? 'Ativo' : 'Desligado'}</span>
                <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!isAdmin || saveSettings.isPending} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => saveSettings.mutate()} disabled={!isAdmin || settingsLoading || saveSettings.isPending}>
                {saveSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configuração
              </Button>
              <Button variant="outline" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || sendMutation.isPending}>
                {previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                Publicar agora (preview)
              </Button>
              <Button variant="accent" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || previewMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Disparar digest manualmente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-card bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-accent" />
              Preview do carrossel
            </CardTitle>
            <CardDescription>
              Gera a capa, slides de resumo e CTA final antes de enviar ao Zapier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {previewData.slides.map((slide, index) => (
                    <a
                      key={slide}
                      href={slide}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-border bg-card"
                    >
                      <img
                        src={slide}
                        alt={`Slide ${index + 1}`}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Legenda</p>
                  <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground font-sans">
                    {previewData.caption}
                  </pre>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                Gere um preview para visualizar os slides e a legenda que serão enviados ao Instagram.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl">Últimas 7 execuções</CardTitle>
          <CardDescription>
            Histórico dos previews e disparos manuais/automáticos do digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {publicationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Notícias</TableHead>
                  <TableHead>Slides</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publications?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.status === 'sent' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'} className="gap-1">
                        {item.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(item.sent_at || item.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell>{item.news_ids?.length || 0}</TableCell>
                    <TableCell>{item.slides_urls?.length || 0}</TableCell>
                    <TableCell>
                      <div className="max-w-[420px]">
                        {item.error ? (
                          <p className="text-sm text-destructive">{item.error}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.caption || '—'}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!publications?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Nenhuma execução registrada ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-secondary/20 shadow-card">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Zap pronto?</p>
            <p className="text-sm text-muted-foreground">
              Use trigger “Webhooks by Zapier → Catch Hook” e mapeie o array <code>slides</code> + campo <code>caption</code>.
            </p>
          </div>
          <a href="https://zapier.com/apps/webhook/help" target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver setup do Zapier
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};
