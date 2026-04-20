import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';

// Aliases used by the feed filter (src/hooks/useNews.ts) — keep in sync.
const FILTER_ALIASES: Record<string, string[]> = {
  'fundos imobiliários': ['fundos imobiliários', 'fundo imobiliário', 'fiis', 'fii', 'reit', 'reits'],
  'mercado imobiliário': ['mercado imobiliário', 'setor imobiliário'],
  'comercial': ['comercial', 'corporativo', 'escritório', 'office'],
  'logística': ['logística', 'logistic', 'galpão', 'warehouse', 'industrial'],
  'governo': ['governo', 'mcmv', 'minha casa minha vida', 'casa verde amarela'],
};

interface DbTopic {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface NewsRow {
  id: string;
  region: string | null;
  topics: unknown;
  summary_ai: string | null;
}

interface TopicAuditRow {
  topicName: string;
  icon: string | null;
  total: number;
  withSummary: number;
  brazil: number;
  international: number;
  aliasMatched: number;
  exactMatched: number;
}

const parseTopics = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

const TopicsAuditPage = () => {
  const [search, setSearch] = useState('');

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['admin-topics-audit-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug, icon')
        .order('name');
      if (error) throw error;
      return data as DbTopic[];
    },
  });

  // Pull all news with topics. Supabase caps at 1000 rows per query — paginate.
  const { data: newsAll, isLoading: newsLoading } = useQuery({
    queryKey: ['admin-topics-audit-news'],
    staleTime: 60_000,
    queryFn: async () => {
      const PAGE = 1000;
      const acc: NewsRow[] = [];
      let from = 0;
      // Hard safety cap at 20k rows
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase
          .from('news')
          .select('id, region, topics, summary_ai')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        acc.push(...(data as NewsRow[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return acc;
    },
  });

  const auditRows: TopicAuditRow[] = useMemo(() => {
    if (!topics || !newsAll) return [];

    return topics.map((topic) => {
      const filterLc = topic.name.toLowerCase();
      const aliases = FILTER_ALIASES[filterLc] ?? [filterLc];

      let total = 0;
      let withSummary = 0;
      let brazil = 0;
      let international = 0;
      let aliasMatched = 0;
      let exactMatched = 0;

      for (const news of newsAll) {
        const newsTopics = parseTopics(news.topics);
        const tagsLc = newsTopics.map((t) => t.toLowerCase());

        const exact = tagsLc.includes(filterLc);
        const matchedByAlias = !exact && tagsLc.some((tagLc) =>
          aliases.some((c) => tagLc === c || tagLc.includes(c) || c.includes(tagLc))
        );

        if (exact || matchedByAlias) {
          total++;
          if (exact) exactMatched++;
          if (matchedByAlias) aliasMatched++;
          if (news.summary_ai && news.summary_ai.trim().length > 0) withSummary++;
          if (news.region === 'Brazil' || !news.region) brazil++;
          else international++;
        }
      }

      return {
        topicName: topic.name,
        icon: topic.icon,
        total,
        withSummary,
        brazil,
        international,
        aliasMatched,
        exactMatched,
      };
    }).sort((a, b) => b.withSummary - a.withSummary);
  }, [topics, newsAll]);

  const filteredRows = useMemo(() => {
    if (!search) return auditRows;
    const q = search.toLowerCase();
    return auditRows.filter((r) => r.topicName.toLowerCase().includes(q));
  }, [auditRows, search]);

  const summary = useMemo(() => {
    if (!newsAll) return null;
    const totalNews = newsAll.length;
    const newsWithoutTopics = newsAll.filter(
      (n) => parseTopics(n.topics).length === 0
    ).length;
    const intlWithoutTopics = newsAll.filter(
      (n) => n.region && n.region !== 'Brazil' && parseTopics(n.topics).length === 0
    ).length;
    const emptyTopics = auditRows.filter((r) => r.withSummary === 0).length;
    return { totalNews, newsWithoutTopics, intlWithoutTopics, emptyTopics };
  }, [newsAll, auditRows]);

  const isLoading = topicsLoading || newsLoading;

  const getHealthBadge = (row: TopicAuditRow) => {
    if (row.withSummary === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vazio
        </Badge>
      );
    }
    if (row.withSummary < 10) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Baixo
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Saudável
      </Badge>
    );
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auditoria de Tópicos</h1>
          <p className="text-muted-foreground mt-1">
            Quantidade de notícias por tópico, considerando aliases usados pelo filtro do feed.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading || !summary ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total de notícias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.totalNews.toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Sem nenhum tópico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.newsWithoutTopics.toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Internacionais sem tópico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.intlWithoutTopics.toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Tópicos vazios</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.emptyTopics}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Tópicos cadastrados</CardTitle>
              <div className="relative w-64 max-w-full">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar tópico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tópico</TableHead>
                      <TableHead className="text-right">Total visível</TableHead>
                      <TableHead className="text-right">Brasil</TableHead>
                      <TableHead className="text-right">Internacional</TableHead>
                      <TableHead className="text-right">Por alias</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.topicName}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            {row.icon && <span>{row.icon}</span>}
                            {row.topicName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.withSummary.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.brazil.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.international.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.aliasMatched > 0 ? `+${row.aliasMatched}` : '—'}
                        </TableCell>
                        <TableCell>{getHealthBadge(row)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum tópico encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              "Total visível" considera só notícias com resumo (que aparecem no feed) e inclui aliases
              (ex.: "Fundos Imobiliários" também conta tags "FIIs"/"REIT"). "Por alias" mostra quantas
              das notícias contam apenas via correspondência por alias, não pelo nome exato.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
};

export default TopicsAuditPage;
export { TopicsAuditPage as TopicsAudit };
