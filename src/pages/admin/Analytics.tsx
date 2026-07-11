import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Users, Bookmark, Newspaper, Radio, ShieldCheck, ShieldOff, Filter } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';

interface DayCount {
  dateStr: string;
  count: number;
}

interface NamedCount {
  name: string;
  count: number;
}

interface RegionCount {
  region: string;
  count: number;
}

interface RelevanceTotals {
  total: number;
  relevant: number;
  rejected: number;
  pending: number;
}

interface RelevanceBreakdown {
  name?: string;
  region?: string;
  relevant: number;
  rejected: number;
  evaluated: number;
  rejectionRate: number;
}

interface AdminAnalytics {
  totalNews: number;
  totalUsers: number;
  totalSaves: number;
  totalSources: number;
  activeSources: number;
  totalTopics: number;
  newsByDay: DayCount[];
  usersByDay: DayCount[];
  savesByDay: DayCount[];
  newsBySource: NamedCount[];
  newsByRegion: RegionCount[];
  usersByRegion: RegionCount[];
  topSavedNews: { id: string; count: number }[];
  relevanceTotals: RelevanceTotals | null;
  relevanceBySource: RelevanceBreakdown[];
  relevanceByRegion: RelevanceBreakdown[];
}

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--accent))', 
  'hsl(var(--secondary))', 
  'hsl(var(--muted))',
  'hsl(var(--destructive))'
];

export const Analytics = () => {
  // Fetch comprehensive analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async (): Promise<AdminAnalytics> => {
      const { data, error } = await supabase.rpc('get_admin_analytics');
      if (error) throw error;
      return data as unknown as AdminAnalytics;
    },
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Dados dos últimos 30 dias
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Notícias"
          value={analytics?.totalNews || 0}
          icon={Newspaper}
        />
        <StatsCard
          title="Total de Usuários"
          value={analytics?.totalUsers || 0}
          icon={Users}
        />
        <StatsCard
          title="Itens Salvos"
          value={analytics?.totalSaves || 0}
          icon={Bookmark}
        />
        <StatsCard
          title="Fontes Ativas"
          value={`${analytics?.activeSources || 0}/${analytics?.totalSources || 0}`}
          icon={Radio}
        />
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Notícias Agregadas (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics?.newsByDay}>
                <XAxis dataKey="dateStr" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Novos Usuários (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics?.usersByDay}>
                <XAxis dataKey="dateStr" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notícias por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.newsBySource?.slice(0, 8)} layout="vertical">
                <XAxis type="number" fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notícias por Região</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics?.newsByRegion}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="region"
                  label={({ region, count }) => `${region}: ${count}`}
                >
                  {analytics?.newsByRegion?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários por Região</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.usersByRegion}>
                <XAxis dataKey="region" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Engajamento: Itens Salvos (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics?.savesByDay}>
              <XAxis dataKey="dateStr" fontSize={10} tickLine={false} />
              <YAxis fontSize={10} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Relevance Filter — last 30 days */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Filtro de Relevância da IA (30 dias)</h2>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Avaliadas"
            value={analytics?.relevanceTotals?.total ?? 0}
            icon={Newspaper}
          />
          <StatsCard
            title="Relevantes"
            value={analytics?.relevanceTotals?.relevant ?? 0}
            icon={ShieldCheck}
          />
          <StatsCard
            title="Rejeitadas"
            value={analytics?.relevanceTotals?.rejected ?? 0}
            icon={ShieldOff}
          />
          <StatsCard
            title="Pendentes"
            value={analytics?.relevanceTotals?.pending ?? 0}
            icon={BarChart3}
          />
        </div>

        {/* Breakdown by source & region */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Fonte</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics?.relevanceBySource?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma notícia avaliada nos últimos 30 dias.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={analytics.relevanceBySource.slice(0, 10)}
                      layout="vertical"
                      stackOffset="sign"
                    >
                      <XAxis type="number" fontSize={10} />
                      <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                      <Tooltip />
                      <Bar dataKey="relevant" stackId="a" fill="hsl(var(--primary))" name="Relevantes" />
                      <Bar dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" name="Rejeitadas" />
                    </BarChart>
                  </ResponsiveContainer>
                  <RejectionRateList
                    items={analytics.relevanceBySource.slice(0, 10).map((s) => ({
                      label: s.name || '—',
                      evaluated: s.evaluated,
                      rejected: s.rejected,
                      rate: s.rejectionRate,
                    }))}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Região</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics?.relevanceByRegion?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma notícia avaliada nos últimos 30 dias.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics.relevanceByRegion} stackOffset="sign">
                      <XAxis dataKey="region" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="relevant" stackId="a" fill="hsl(var(--primary))" name="Relevantes" />
                      <Bar dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" name="Rejeitadas" />
                    </BarChart>
                  </ResponsiveContainer>
                  <RejectionRateList
                    items={analytics.relevanceByRegion.map((r) => ({
                      label: r.region || '—',
                      evaluated: r.evaluated,
                      rejected: r.rejected,
                      rate: r.rejectionRate,
                    }))}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Small table under each chart with the raw numbers + rejection rate, so
// admins can eyeball which sources/regions the AI is filtering most aggressively.
function RejectionRateList({
  items,
}: {
  items: Array<{ label: string; evaluated: number; rejected: number; rate: number }>;
}) {
  return (
    <div className="mt-4 space-y-1 text-xs">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
          <span className="truncate text-foreground">{it.label}</span>
          <span className="text-muted-foreground shrink-0">
            {it.rejected}/{it.evaluated}{' '}
            <span
              className={
                it.rate >= 50
                  ? 'text-destructive font-medium'
                  : it.rate >= 25
                    ? 'text-orange-500 font-medium'
                    : 'text-muted-foreground'
              }
            >
              ({it.rate}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
