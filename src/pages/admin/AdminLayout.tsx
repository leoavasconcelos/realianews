import { Outlet, useLocation } from 'react-router-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Seo } from '@/components/Seo';

const ADMIN_META: Record<string, { title: string; description: string }> = {
  '/admin': { title: 'Dashboard · Admin REalia', description: 'Painel de administração do REalia: visão geral, métricas e ações rápidas.' },
  '/admin/news': { title: 'Gestão de Notícias · Admin REalia', description: 'Gerencie o feed de notícias imobiliárias do REalia.' },
  '/admin/topics': { title: 'Tópicos · Admin REalia', description: 'Configure tópicos e categorias do feed REalia.' },
  '/admin/topics/audit': { title: 'Auditoria de Tópicos · Admin REalia', description: 'Auditoria e revisão da classificação de tópicos.' },
  '/admin/sources': { title: 'Fontes · Admin REalia', description: 'Gestão das fontes de notícias monitoradas.' },
  '/admin/users': { title: 'Usuários · Admin REalia', description: 'Administração de contas e perfis de usuários.' },
  '/admin/analytics': { title: 'Analytics · Admin REalia', description: 'Métricas de uso, engajamento e crescimento.' },
  '/admin/instagram': { title: 'Automação Instagram · Admin REalia', description: 'Pipeline de publicação automatizada no Instagram.' },
  '/admin/crawl': { title: 'Monitor de Crawl · Admin REalia', description: 'Monitoramento diário de indexação e erros de crawl.' },
};

export const AdminLayout = () => {
  const { pathname } = useLocation();
  const meta = ADMIN_META[pathname] ?? { title: 'Admin · REalia', description: 'Painel de administração do REalia.' };
  return (
    <AdminGuard>
      <Seo title={meta.title} description={meta.description} path={pathname} noindex />
      <div className="min-h-screen bg-background flex flex-col">
        <AdminHeader />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminGuard>
  );
};
