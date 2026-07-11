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
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, TrendingUp, Users, Bookmark, Newspaper, Radio } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';

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
    queryFn: async () => {
      // Get all data in parallel
      const [
        newsResult,
        profilesResult,
        savedItemsResult,
        sourcesResult,
        topicsResult,
      ] = await Promise.all([
        supabase.from('news').select('id, published_at, region, source_id'),
        supabase.from('profiles').select('id, created_at, preferred_regions, interests'),
        supabase.from('user_saved_items').select('id, saved_at, news_id, user_id'),
        supabase.from('sources').select('id, name, is_active'),
        supabase.from('topics').select('id, name, slug'),
      ]);

      const news = newsResult.data || [];
      const profiles = profilesResult.data || [];
      const savedItems = savedItemsResult.data || [];
      const sources = sourcesResult.data || [];
      const topics = topicsResult.data || [];

      // Calculate news by day (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 29 - i));
        return {
          date,
          dateStr: format(date, 'dd/MM'),
          count: 0,
        };
      });

      news.forEach(n => {
        const newsDate = startOfDay(new Date(n.published_at));
        const dayData = last30Days.find(d => d.date.getTime() === newsDate.getTime());
        if (dayData) dayData.count++;
      });

      // Calculate users by day (last 30 days)
      const usersLast30Days = Array.from({ length: 30 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 29 - i));
        return {
          date,
          dateStr: format(date, 'dd/MM'),
          count: 0,
        };
      });

      profiles.forEach(p => {
        const userDate = startOfDay(new Date(p.created_at));
        const dayData = usersLast30Days.find(d => d.date.getTime() === userDate.getTime());
        if (dayData) dayData.count++;
      });

      // Calculate saves by day (last 30 days)
      const savesLast30Days = Array.from({ length: 30 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 29 - i));
        return {
          date,
          dateStr: format(date, 'dd/MM'),
          count: 0,
        };
      });

      savedItems.forEach(s => {
        const saveDate = startOfDay(new Date(s.saved_at));
        const dayData = savesLast30Days.find(d => d.date.getTime() === saveDate.getTime());
        if (dayData) dayData.count++;
      });

      // News by source
      const newsBySource: Record<string, number> = {};
      news.forEach(n => {
        const source = sources.find(s => s.id === n.source_id);
        const sourceName = source?.name || 'Unknown';
        newsBySource[sourceName] = (newsBySource[sourceName] || 0) + 1;
      });

      // News by region
      const newsByRegion: Record<string, number> = {};
      news.forEach(n => {
        const region = n.region || 'Unknown';
        newsByRegion[region] = (newsByRegion[region] || 0) + 1;
      });

      // Users by region preference
      const usersByRegion: Record<string, number> = {};
      profiles.forEach(p => {
        const regions = Array.isArray(p.preferred_regions) ? p.preferred_regions : [];
        regions.forEach((region: string) => {
          usersByRegion[region] = (usersByRegion[region] || 0) + 1;
        });
      });

      // Top saved news
      const savesByNews: Record<string, number> = {};
      savedItems.forEach(s => {
        savesByNews[s.news_id] = (savesByNews[s.news_id] || 0) + 1;
      });

      const topSavedNewsIds = Object.entries(savesByNews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count }));

      return {
        totalNews: news.length,
        totalUsers: profiles.length,
        totalSaves: savedItems.length,
        totalSources: sources.length,
        activeSources: sources.filter(s => s.is_active).length,
        totalTopics: topics.length,
        newsByDay: last30Days,
        usersByDay: usersLast30Days,
        savesByDay: savesLast30Days,
        newsBySource: Object.entries(newsBySource).map(([name, count]) => ({ name, count })),
        newsByRegion: Object.entries(newsByRegion).map(([region, count]) => ({ region, count })),
        usersByRegion: Object.entries(usersByRegion).map(([region, count]) => ({ region, count })),
        topSavedNews: topSavedNewsIds,
      };
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
    </div>
  );
};
