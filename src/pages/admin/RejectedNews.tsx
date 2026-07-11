import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Loader2, RotateCcw, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface RejectedNewsRow {
  id: string;
  title: string;
  source_url: string | null;
  region: string | null;
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
}

// Parses "[CATEGORY] explanation" produced by process-news-summaries.
function parseReason(raw: string | null): { category: string | null; detail: string } {
  if (!raw) return { category: null, detail: '—' };
  const match = raw.match(/^\s*\[([A-Z_]+)\]\s*(.*)$/);
  if (match) return { category: match[1], detail: match[2] || '—' };
  return { category: null, detail: raw };
}

export const RejectedNews = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rejected-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, source_url, region, rejection_reason, created_at, published_at')
        .eq('is_relevant', false)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as RejectedNewsRow[];
    },
  });

  // "Marcar como relevante" = queue for reprocessing by setting is_relevant/summary_ai/rejection_reason
  // back to NULL. The process-news-summaries cron picks up rows where both summary_ai and
  // is_relevant are NULL, so on the next run the article will be re-evaluated and, if
  // approved this time, get a fresh summary and reappear in the feed.
  const requeueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('news')
        .update({ is_relevant: null, rejection_reason: null, summary_ai: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notícia enviada para reprocessamento');
      queryClient.invalidateQueries({ queryKey: ['admin-rejected-news'] });
    },
    onError: (err) => {
      toast.error('Falha ao reprocessar', { description: (err as Error).message });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldOff className="h-6 w-6 text-muted-foreground" />
          Notícias Rejeitadas pela IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Artigos que a IA marcou como fora do escopo do mercado imobiliário.
          Clique em <span className="font-medium">"Reprocessar"</span> para
          enviar de volta para avaliação e, se aprovado, retornar ao feed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading ? 'Carregando…' : `${data?.length ?? 0} notícia(s) rejeitada(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma notícia rejeitada por enquanto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Título</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const { category, detail } = parseReason(row.rejection_reason);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium align-top">
                          <div className="line-clamp-2">{row.title}</div>
                          {row.source_url && (
                            <a
                              href={row.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1"
                            >
                              Abrir origem <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="align-top max-w-[360px]">
                          {category && (
                            <Badge variant="outline" className="mb-1 font-mono text-[10px]">
                              {category}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-3">{detail}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="secondary">{row.region ?? '—'}</Badge>
                        </TableCell>
                        <TableCell className="align-top whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={requeueMutation.isPending}
                            onClick={() => requeueMutation.mutate(row.id)}
                          >
                            {requeueMutation.isPending &&
                            requeueMutation.variables === row.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Marcar como relevante
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
