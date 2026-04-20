import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NewsEditModal } from '@/components/admin/NewsEditModal';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ExternalLink, 
  Trash2, 
  TrendingUp, 
  Loader2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Languages,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const REGIONS = ['All', 'Brazil', 'USA', 'Europe', 'Asia', 'Global'];
const PAGE_SIZE = 20;

export const NewsManagement = () => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const handleRegionChange = (value: string) => {
    setRegionFilter(value);
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-news', regionFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from('news')
        .select('*, sources(name)', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (regionFilter !== 'All') {
        query = query.eq('region', regionFilter);
      }
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data, totalCount: count || 0 };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      toast.success('Notícia deletada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao deletar notícia: ' + error.message);
    },
  });

  const toggleTrendingMutation = useMutation({
    mutationFn: async ({ id, isTrending }: { id: string; isTrending: boolean }) => {
      const { error } = await supabase
        .from('news')
        .update({ is_trending: !isTrending })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      toast.success('Status de trending atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const news = data?.items;
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const [exporting, setExporting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const handleRegenerateAnalysis = async (id: string) => {
    setRegeneratingId(id);
    try {
      // Clear cached analysis so the edge function regenerates from scratch with the latest prompt.
      const { error: clearError } = await supabase
        .from('news')
        .update({ full_analysis: null })
        .eq('id', id);
      if (clearError) throw clearError;

      const { data: result, error } = await supabase.functions.invoke('generate-full-analysis', {
        body: { newsId: id },
      });
      if (error) throw error;
      const analysis = (result as { fullAnalysis?: string })?.fullAnalysis;
      if (!analysis) throw new Error('Análise vazia retornada pela IA');

      toast.success('Análise regenerada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['admin-news-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['full-analysis', id] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao regenerar análise: ' + message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleTranslatePending = async () => {
    setTranslating(true);
    setTranslateProgress(0);
    let totalProcessed = 0;
    let consecutiveEmpty = 0;
    const MAX_BATCHES = 50; // safety cap

    try {
      for (let i = 0; i < MAX_BATCHES; i++) {
        const { data: result, error } = await supabase.functions.invoke('process-news-summaries', {
          body: { mode: 'titles_only' },
        });
        if (error) throw error;

        const processed = (result as { processed?: number })?.processed ?? 0;
        const results = (result as { results?: Array<{ status: string }> })?.results ?? [];
        const meaningful = results.filter((r) => r.status === 'title_translated').length;

        totalProcessed += meaningful;
        setTranslateProgress(totalProcessed);

        if (processed === 0 || meaningful === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) break; // nothing left to translate
        } else {
          consecutiveEmpty = 0;
        }

        // small pause between batches
        await new Promise((r) => setTimeout(r, 800));
      }

      toast.success(`Backfill concluído: ${totalProcessed} títulos traduzidos`);
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao traduzir títulos: ' + message);
    } finally {
      setTranslating(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('news')
        .select('title, source_url, region, published_at, is_trending, read_time, summary_ai, sources(name)')
        .order('published_at', { ascending: false });

      if (regionFilter !== 'All') query = query.eq('region', regionFilter);
      if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

      const { data: rows, error } = await query;
      if (error) throw error;
      if (!rows?.length) { toast.info('Nenhuma notícia para exportar'); return; }

      const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['Título', 'Fonte', 'Região', 'Data', 'Trending', 'Tempo de Leitura', 'Resumo', 'URL'];
      const csvRows = rows.map(r => [
        escape(r.title),
        escape((r.sources as { name: string } | null)?.name || ''),
        escape(r.region || ''),
        escape(format(new Date(r.published_at), 'dd/MM/yyyy', { locale: ptBR })),
        r.is_trending ? 'Sim' : 'Não',
        escape(r.read_time || ''),
        escape((r.summary_ai || '').substring(0, 200)),
        escape(r.source_url),
      ].join(','));

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noticias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} notícias exportadas`);
    } catch (err: any) {
      toast.error('Erro ao exportar: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Notícias</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleTranslatePending} disabled={translating}>
            {translating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
            {translating ? `Traduzindo... (${translateProgress})` : 'Traduzir títulos pendentes'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar CSV
          </Button>
          <Badge variant="secondary">{totalCount} notícias</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(region => (
                  <SelectItem key={region} value={region}>
                    {region === 'All' ? 'Todas as regiões' : region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Título</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <p className="line-clamp-2">{item.title}</p>
                    </TableCell>
                    <TableCell>
                      {(item.sources as { name: string } | null)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.region}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.published_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {item.is_trending && (
                        <Badge className="bg-accent text-accent-foreground">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingNewsId(item.id)}
                          title="Editar notícia"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRegenerateAnalysis(item.id)}
                          disabled={regeneratingId === item.id}
                          title="Regenerar análise completa (limpa cache e chama IA)"
                        >
                          {regeneratingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTrendingMutation.mutate({ 
                            id: item.id, 
                            isTrending: item.is_trending 
                          })}
                          title={item.is_trending ? 'Remover trending' : 'Marcar como trending'}
                        >
                          <TrendingUp className={`h-4 w-4 ${item.is_trending ? 'text-accent' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar notícia?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A notícia será permanentemente removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {news?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhuma notícia encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} ({totalCount} resultados)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <NewsEditModal
        newsId={editingNewsId}
        open={!!editingNewsId}
        onOpenChange={(open) => { if (!open) setEditingNewsId(null); }}
      />
    </div>
  );
};
