import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RunRow {
  id: string;
  ran_at: string;
  total_urls: number;
  ok_count: number;
  redirect_count: number;
  error_count: number;
  changed: boolean;
  alert_sent: boolean;
}

interface UrlRow {
  id: string;
  run_id: string;
  url: string;
  status_code: number | null;
  final_url: string | null;
  category: string;
  previous_status_code: number | null;
  previous_category: string | null;
  changed: boolean;
  error: string | null;
  checked_at: string;
}

const categoryLabel = (c: string) => {
  switch (c) {
    case 'ok': return 'OK';
    case 'redirect': return 'Redirect';
    case 'client_error': return 'Erro 4xx';
    case 'server_error': return 'Erro 5xx';
    case 'network_error': return 'Sem resposta';
    default: return c;
  }
};

const categoryVariant = (c: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (c === 'ok') return 'default';
  if (c === 'redirect') return 'secondary';
  return 'destructive';
};

export const CrawlMonitor = () => {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [urls, setUrls] = useState<UrlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crawl_monitor_runs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(30);
    if (error) {
      toast({ title: 'Erro ao carregar execuções', description: error.message, variant: 'destructive' });
    } else {
      const rows = (data || []) as RunRow[];
      setRuns(rows);
      if (rows.length && !selectedRunId) setSelectedRunId(rows[0].id);
    }
    setLoading(false);
  };

  const loadUrls = async (runId: string) => {
    const { data, error } = await supabase
      .from('crawl_monitor_urls')
      .select('*')
      .eq('run_id', runId)
      .order('changed', { ascending: false })
      .order('category', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar URLs', description: error.message, variant: 'destructive' });
    } else {
      setUrls((data || []) as UrlRow[]);
    }
  };

  useEffect(() => { loadRuns(); }, []);
  useEffect(() => { if (selectedRunId) loadUrls(selectedRunId); }, [selectedRunId]);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('monitor-crawl-health', { body: {} });
    setRunning(false);
    if (error) {
      toast({ title: 'Falha ao executar', description: error.message, variant: 'destructive' });
      return;
    }
    const changedCount = (data as { changedCount?: number })?.changedCount ?? 0;
    toast({
      title: 'Verificação concluída',
      description: changedCount > 0 ? `${changedCount} URL(s) mudaram de estado. Alerta por e-mail enviado.` : 'Nenhuma mudança detectada.',
    });
    await loadRuns();
  };

  const selectedRun = useMemo(() => runs.find((r) => r.id === selectedRunId), [runs, selectedRunId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitor de Crawl</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Varre diariamente as URLs do sitemap e alerta os admins por e-mail quando algum status HTTP muda (novo 404, redirect, erro 5xx).
          </p>
        </div>
        <Button onClick={runNow} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Executar agora
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma execução ainda. Clique em <strong>Executar agora</strong> para gerar o primeiro snapshot.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Execuções</h2>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    run.id === selectedRunId ? 'bg-primary/10 border-primary' : 'border-border hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatDistanceToNow(new Date(run.ran_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {run.changed ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {run.total_urls} URLs · {run.error_count} erros
                    {run.alert_sent && ' · alerta enviado'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {selectedRun && (
              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold">{selectedRun.total_urls}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">OK</div>
                  <div className="text-2xl font-bold text-green-600">{selectedRun.ok_count}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Redirects</div>
                  <div className="text-2xl font-bold">{selectedRun.redirect_count}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Erros</div>
                  <div className="text-2xl font-bold text-destructive">{selectedRun.error_count}</div>
                </Card>
              </div>
            )}

            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                <div>URL</div>
                <div>Anterior</div>
                <div>Agora</div>
                <div>Δ</div>
              </div>
              <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
                {urls.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nenhuma URL nesta execução.</div>
                ) : (
                  urls.map((u) => (
                    <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 items-center">
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono truncate hover:underline flex items-center gap-1"
                        title={u.url}
                      >
                        {u.url.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {u.previous_category ? `${categoryLabel(u.previous_category)} (${u.previous_status_code ?? '—'})` : '—'}
                      </div>
                      <div>
                        <Badge variant={categoryVariant(u.category)}>
                          {categoryLabel(u.category)} {u.status_code ? `(${u.status_code})` : ''}
                        </Badge>
                      </div>
                      <div>
                        {u.changed ? <Badge variant="destructive">mudou</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrawlMonitor;