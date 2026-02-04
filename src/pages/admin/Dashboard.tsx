import { Newspaper, Users, Bookmark, Tags, Radio, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { useAdminStats } from '@/hooks/useAdminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

export const Dashboard = () => {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Notícias"
          value={stats?.totalNews || 0}
          icon={Newspaper}
        />
        <StatsCard
          title="Usuários Cadastrados"
          value={stats?.totalUsers || 0}
          icon={Users}
        />
        <StatsCard
          title="Itens Salvos"
          value={stats?.totalSavedItems || 0}
          icon={Bookmark}
        />
        <StatsCard
          title="Tópicos Ativos"
          value={stats?.totalTopics || 0}
          icon={Tags}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News by Region Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Notícias por Região
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.newsByRegion && stats.newsByRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.newsByRegion}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="region"
                    label={({ region, count }) => `${region}: ${count}`}
                  >
                    {stats.newsByRegion.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* News by Region Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Distribuição por Região
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.newsByRegion && stats.newsByRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.newsByRegion}>
                  <XAxis dataKey="region" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Notícias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentNews?.map((news) => (
                <div key={news.id} className="flex items-start justify-between gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{news.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(news.published_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-xs bg-secondary px-2 py-1 rounded shrink-0">
                    {news.region}
                  </span>
                </div>
              ))}
              {(!stats?.recentNews || stats.recentNews.length === 0) && (
                <p className="text-sm text-muted-foreground">Nenhuma notícia recente</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentUsers?.map((user) => (
                <div key={user.id} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{user.display_name || 'Usuário'}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <p className="text-sm text-muted-foreground">Nenhum usuário recente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
