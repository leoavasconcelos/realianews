import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Instagram,
  Loader2,
  RefreshCcw,
  Send,
  Sparkles,
  TimerReset,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstagramSettingsRow {
  id: string;
  webhook_url: string | null;
  enabled: boolean;
  mode: 'approval_queue';
  auto_enqueue_enabled: boolean;
  min_interval_minutes: number;
  single_post_default: boolean;
  carousel_when_multiple_images: boolean;
  max_caption_length: number;
  brand_style: string;
  updated_at: string;
}

interface InstagramPublicationRow {
  id: string;
  status: 'queued' | 'preview' | 'approved' | 'sent' | 'failed' | 'cancelled';
  post_type: 'single_image' | 'carousel';
  caption: string | null;
  error: string | null;
  sent_at: string | null;
  published_at: string | null;
  created_at: string;
  title_snapshot: string | null;
  section_label: string | null;
  source_snapshot: string | null;
  news_ids: string[] | null;
  slides_urls: string[] | null;
  metadata?: { public_urls_preview?: string[] } | null;
}

interface PreviewResponse {
  publicationId: string;
  caption: string;
  slides: string[];
  postType: 'single_image' | 'carousel';
  news: Array<{
    id: string;
    title: string;
    source: string;
    topics: string[];
  }>;
}

const isQueueResponse = (
  value: PreviewResponse | { message?: string; queuedCount?: number; publicationIds?: string[] },
): value is { message?: string; queuedCount?: number; publicationIds?: string[] } => {
  return 'queuedCount' in value || 'message' in value;
};

export const InstagramAutomation = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [autoEnqueueEnabled, setAutoEnqueueEnabled] = useState(true);
  const [minIntervalMinutes, setMinIntervalMinutes] = useState('90');
  const [singlePostDefault, setSinglePostDefault] = useState(true);
  const [carouselWhenMultipleImages, setCarouselWhenMultipleImages] = useState(true);
  const [maxCaptionLength, setMaxCaptionLength] = useState('1600');
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [selectedPublicationId, setSelectedPublicationId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const scrollToPreview = () => {
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const invokeInstagramFlow = async (body: {
    mode: 'generate_queue' | 'preview_post' | 'send_post' | 'regenerate_post' | 'webhook_test';
    publicationId?: string;
    limit?: number;
    force?: boolean;
  }) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const { data, error } = await supabase.functions.invoke('publish-instagram-digest', {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) throw error;
    return data as PreviewResponse | { message?: string; queuedCount?: number; publicationIds?: string[] };
  };

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['instagram-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InstagramSettingsRow | null;
    },
  });

  const { data: publications, isLoading: publicationsLoading } = useQuery({
    queryKey: ['instagram-publications'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_publications')
        .select('id, status, post_type, caption, error, sent_at, published_at, created_at, title_snapshot, section_label, source_snapshot, news_ids, slides_urls, metadata')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as InstagramPublicationRow[];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setWebhookUrl(settings.webhook_url || '');
    setEnabled(settings.enabled);
    setAutoEnqueueEnabled(settings.auto_enqueue_enabled);
    setMinIntervalMinutes(String(settings.min_interval_minutes || 90));
    setSinglePostDefault(settings.single_post_default);
    setCarouselWhenMultipleImages(settings.carousel_when_multiple_images);
    setMaxCaptionLength(String(settings.max_caption_length || 1600));
  }, [settings]);

  const queueItems = useMemo(
    () => (publications || []).filter((item) => ['queued', 'preview', 'approved'].includes(item.status)),
    [publications],
  );

  const historyItems = useMemo(
    () => (publications || []).filter((item) => ['sent', 'cancelled', 'failed'].includes(item.status)).slice(0, 7),
    [publications],
  );

  const selectedPublication = queueItems.find((item) => item.id === selectedPublicationId) || null;
  const latestStatus = publications?.[0]?.status;

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload = {
        webhook_url: webhookUrl.trim() || null,
        enabled,
        auto_enqueue_enabled: autoEnqueueEnabled,
        min_interval_minutes: Math.max(15, Number(minIntervalMinutes) || 90),
        single_post_default: singlePostDefault,
        carousel_when_multiple_images: carouselWhenMultipleImages,
        max_caption_length: Math.max(280, Number(maxCaptionLength) || 1600),
        mode: 'approval_queue',
        brand_style: 'notjournal_editorial',
      };

      if (settings?.id) {
        const { error } = await (supabase as any).from('instagram_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('instagram_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-settings'] });
      toast.success('Configuração editorial salva');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const generateQueueMutation = useMutation({
    mutationFn: async () => invokeInstagramFlow({ mode: 'generate_queue', limit: 4 }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success(
        isQueueResponse(data) && data.queuedCount
          ? `${data.queuedCount} posts entraram na fila`
          : isQueueResponse(data) && data.message
            ? data.message
            : 'Fila atualizada',
      );
    },
    onError: (error: Error) => toast.error(`Erro ao gerar fila: ${error.message}`),
  });

  const previewMutation = useMutation({
    mutationFn: async (publicationId: string) => invokeInstagramFlow({ mode: 'preview_post', publicationId }) as Promise<PreviewResponse>,
    onSuccess: (data) => {
      setPreviewData(data);
      setSelectedPublicationId(data.publicationId);
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success('Preview gerado');
      scrollToPreview();
    },
    onError: (error: Error) => toast.error(`Erro ao gerar preview: ${error.message}`),
  });

  const regenerateMutation = useMutation({
    mutationFn: async (publicationId: string) => invokeInstagramFlow({ mode: 'regenerate_post', publicationId }) as Promise<PreviewResponse>,
    onSuccess: (data) => {
      setPreviewData(data);
      setSelectedPublicationId(data.publicationId);
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success('Arte regenerada');
      scrollToPreview();
    },
    onError: (error: Error) => toast.error(`Erro ao regenerar: ${error.message}`),
  });

  const sendMutation = useMutation({
    mutationFn: async (publicationId: string) => invokeInstagramFlow({ mode: 'send_post', publicationId }) as Promise<PreviewResponse>,
    onSuccess: (data) => {
      setPreviewData(data);
      queryClient.invalidateQueries({ queryKey: ['instagram-publications'] });
      toast.success('Post enviado ao Zapier');
    },
    onError: (error: Error) => toast.error(`Erro ao enviar: ${error.message}`),
  });

  const webhookTestMutation = useMutation({
    mutationFn: async () => invokeInstagramFlow({ mode: 'webhook_test' }) as Promise<{ message?: string }>,
    onSuccess: (data) => toast.success(data?.message || 'Teste enviado ao Zapier'),
    onError: (error: Error) => toast.error(`Erro ao testar webhook: ${error.message}`),
  });

  const previewImages = previewData?.slides || (selectedPublication?.metadata?.public_urls_preview ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila editorial do Instagram</h1>
          <p className="mt-1 text-muted-foreground">
            Posts frequentes com aprovação manual, imagem única por padrão e carrossel só quando fizer sentido.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {latestStatus && (
            <Badge variant={latestStatus === 'sent' ? 'default' : latestStatus === 'failed' ? 'destructive' : 'secondary'}>
              Último status: {latestStatus}
            </Badge>
          )}
          <Badge variant="outline">Tempo real</Badge>
          <Badge variant="outline">Aprovação manual</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Instagram className="h-5 w-5 text-primary" />
              Configuração editorial
            </CardTitle>
            <CardDescription>
              Controle a fila, o intervalo mínimo entre posts e o comportamento visual do Instagram.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Webhook do Zapier</label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  disabled={!isAdmin || saveSettings.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, o backend usa o secret seguro já configurado no projeto.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Intervalo mínimo entre posts</label>
                <Input type="number" min={15} step={15} value={minIntervalMinutes} onChange={(e) => setMinIntervalMinutes(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Máximo da legenda</label>
                <Input type="number" min={280} step={50} value={maxCaptionLength} onChange={(e) => setMaxCaptionLength(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Fila habilitada</p>
                    <p className="text-sm text-muted-foreground">Permite gerar e revisar posts no painel.</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!isAdmin || saveSettings.isPending} />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Entrada automática na fila</p>
                    <p className="text-sm text-muted-foreground">Prepara novos posts assim que surgirem notícias elegíveis.</p>
                  </div>
                  <Switch checked={autoEnqueueEnabled} onCheckedChange={setAutoEnqueueEnabled} disabled={!isAdmin || saveSettings.isPending} />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Imagem única como padrão</p>
                    <p className="text-sm text-muted-foreground">Mantém a linguagem de portal nativo do Instagram.</p>
                  </div>
                  <Switch checked={singlePostDefault} onCheckedChange={setSinglePostDefault} disabled={!isAdmin || saveSettings.isPending} />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Carrossel opcional</p>
                    <p className="text-sm text-muted-foreground">Só ativa quando houver mais imagens realmente úteis.</p>
                  </div>
                  <Switch checked={carouselWhenMultipleImages} onCheckedChange={setCarouselWhenMultipleImages} disabled={!isAdmin || saveSettings.isPending} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => saveSettings.mutate()} disabled={!isAdmin || settingsLoading || saveSettings.isPending}>
                {saveSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configuração
              </Button>
              <Button variant="outline" onClick={() => generateQueueMutation.mutate()} disabled={generateQueueMutation.isPending}>
                {generateQueueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Atualizar fila
              </Button>
              <Button variant="outline" onClick={() => webhookTestMutation.mutate()} disabled={webhookTestMutation.isPending}>
                {webhookTestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Testar webhook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card ref={previewRef} className="border-border/70 shadow-card bg-gradient-card scroll-mt-24 ring-1 ring-transparent data-[has-preview=true]:ring-primary/40 transition" data-has-preview={previewImages.length > 0}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ImageIcon className="h-5 w-5 text-accent" />
              Preview do post
            </CardTitle>
            <CardDescription>
              Foto protagonista, título sobre a imagem e legenda curta em ritmo de portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewImages.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {previewImages.map((slide, index) => (
                    <a
                      key={slide}
                      href={slide}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <img
                        src={slide}
                        alt={`Preview ${index + 1}`}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Legenda</p>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                    {previewData?.caption || selectedPublication?.caption || '—'}
                  </pre>
                </div>
                {selectedPublicationId && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={() => sendMutation.mutate(selectedPublicationId)}
                      disabled={sendMutation.isPending}
                    >
                      {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Aprovar e enviar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => regenerateMutation.mutate(selectedPublicationId)}
                      disabled={regenerateMutation.isPending}
                    >
                      {regenerateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                      Regenerar
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
                Selecione um item da fila para gerar a arte principal e revisar a legenda antes de enviar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl">Fila de posts</CardTitle>
          <CardDescription>
            Revise, gere preview, regenere e aprove o envio de cada notícia individualmente.
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
                  <TableHead>Post</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Quando entrou</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.status === 'failed' ? 'destructive' : item.status === 'approved' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                        <Badge variant="outline">{item.post_type === 'carousel' ? 'carrossel' : 'imagem única'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[360px]">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title_snapshot || 'Sem título'}</p>
                        <p className="text-xs text-muted-foreground">{item.section_label || 'Mercado'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.source_snapshot || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => previewMutation.mutate(item.id)} disabled={previewMutation.isPending}>
                          {previewMutation.isPending && selectedPublicationId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => regenerateMutation.mutate(item.id)} disabled={regenerateMutation.isPending}>
                          {regenerateMutation.isPending && selectedPublicationId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                          Regenerar
                        </Button>
                        <Button size="sm" variant="accent" onClick={() => sendMutation.mutate(item.id)} disabled={sendMutation.isPending}>
                          {sendMutation.isPending && selectedPublicationId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Aprovar e enviar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!queueItems.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Nenhum post pendente na fila agora.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl">Histórico recente</CardTitle>
          <CardDescription>
            Últimas publicações enviadas ou arquivadas pela operação editorial.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Legenda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.status === 'sent' ? 'default' : 'secondary'} className="gap-1">
                      {item.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[320px]">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title_snapshot || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground">{item.post_type === 'carousel' ? 'Carrossel' : 'Imagem única'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.published_at || item.sent_at
                      ? formatDistanceToNow(new Date(item.published_at || item.sent_at || item.created_at), { addSuffix: true, locale: ptBR })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[420px] line-clamp-2 text-sm text-muted-foreground">{item.caption || item.error || '—'}</p>
                  </TableCell>
                </TableRow>
              ))}
              {!historyItems.length && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    Ainda não há publicações concluídas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-secondary/20 shadow-card">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Zap pronto?</p>
            <p className="text-sm text-muted-foreground">
              Use trigger “Webhooks by Zapier → Catch Hook” e mapeie <code>images</code>, <code>caption</code>, <code>postType</code> e <code>title</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><TimerReset className="h-3.5 w-3.5" /> Intervalo mínimo</Badge>
            <Badge variant="outline" className="gap-1"><Wand2 className="h-3.5 w-3.5" /> Preview manual</Badge>
            <a href="https://zapier.com/apps/webhook/help" target="_blank" rel="noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver setup do Zapier
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
