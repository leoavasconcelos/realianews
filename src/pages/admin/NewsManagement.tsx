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
  Edit
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

export const NewsManagement = () => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: news, isLoading } = useQuery({
    queryKey: ['admin-news', regionFilter],
    queryFn: async () => {
      let query = supabase
        .from('news')
        .select('*, sources(name)')
        .order('published_at', { ascending: false })
        .limit(100);

      if (regionFilter !== 'All') {
        query = query.eq('region', regionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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

  const filteredNews = news?.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Notícias</h1>
        <Badge variant="secondary">{filteredNews?.length || 0} notícias</Badge>
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
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
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
                {filteredNews?.map((item) => (
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
                {filteredNews?.length === 0 && (
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

      {/* Edit Modal */}
      <NewsEditModal
        newsId={editingNewsId}
        open={!!editingNewsId}
        onOpenChange={(open) => { if (!open) setEditingNewsId(null); }}
      />
    </div>
  );
};
