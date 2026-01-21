import React from 'react';
import { 
  User, 
  Bookmark, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Settings,
  Heart
} from 'lucide-react';
import Logo from './Logo';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'saved', label: 'Salvos', icon: <Bookmark className="w-5 h-5" />, badge: '12' },
  { id: 'interests', label: 'Meus Interesses', icon: <Heart className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notificações', icon: <Bell className="w-5 h-5" /> },
  { id: 'blocked', label: 'Fontes Bloqueadas', icon: <Shield className="w-5 h-5" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  { id: 'help', label: 'Ajuda e Suporte', icon: <HelpCircle className="w-5 h-5" /> },
];

const ProfileScreen: React.FC = () => {
  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Usuário REalia</h1>
            <p className="text-sm text-muted-foreground">usuario@email.com</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">127</p>
            <p className="text-xs text-muted-foreground">Notícias lidas</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground">Salvos</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">5</p>
            <p className="text-xs text-muted-foreground">Interesses</p>
          </div>
        </div>
      </div>
      
      {/* Menu */}
      <div className="px-4">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="text-muted-foreground">{item.icon}</div>
              <span className="flex-1 text-left font-medium text-foreground">
                {item.label}
              </span>
              {item.badge && (
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        
        {/* Logout */}
        <button className="w-full flex items-center gap-4 px-4 py-4 mt-4 text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da Conta</span>
        </button>
        
        {/* Version */}
        <div className="text-center py-8">
          <Logo size="sm" className="justify-center mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">Versão 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
