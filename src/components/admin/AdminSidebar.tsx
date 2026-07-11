import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Newspaper, 
  Tags, 
  Radio, 
  Users, 
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Activity,
  ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const menuItems = [
  { 
    path: '/admin', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    adminOnly: false 
  },
  { 
    path: '/admin/news', 
    label: 'Notícias', 
    icon: Newspaper,
    adminOnly: false 
  },
  { 
    path: '/admin/topics', 
    label: 'Tópicos', 
    icon: Tags,
    adminOnly: true 
  },
  { 
    path: '/admin/topics/audit', 
    label: 'Auditoria de Tópicos', 
    icon: ShieldCheck,
    adminOnly: true 
  },
  { 
    path: '/admin/sources', 
    label: 'Fontes', 
    icon: Radio,
    adminOnly: true 
  },
  { 
    path: '/admin/users', 
    label: 'Usuários', 
    icon: Users,
    adminOnly: true 
  },
  { 
    path: '/admin/analytics', 
    label: 'Analytics', 
    icon: BarChart3,
    adminOnly: false 
  },
  { 
    path: '/admin/instagram', 
    label: 'Fila Instagram', 
    icon: Instagram,
    adminOnly: false 
  },
  {
    path: '/admin/crawl',
    label: 'Monitor de Crawl',
    icon: Activity,
    adminOnly: true
  },
  {
    path: '/admin/rejected',
    label: 'Rejeitadas (IA)',
    icon: ShieldOff,
    adminOnly: false
  },
];

export const AdminSidebar = () => {
  const { isAdmin } = useAdminAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside 
      className={cn(
        "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  "hover:bg-accent/50",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
};
