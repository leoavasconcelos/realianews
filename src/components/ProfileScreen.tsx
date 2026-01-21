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
  Heart,
  LogIn
} from 'lucide-react';
import Logo from './Logo';
import { Button } from './ui/button';
import { useAuth, Profile } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { User as AuthUser } from '@supabase/supabase-js';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'saved', label: 'Salvos', icon: <Bookmark className="w-5 h-5" /> },
  { id: 'interests', label: 'Meus Interesses', icon: <Heart className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notificações', icon: <Bell className="w-5 h-5" /> },
  { id: 'blocked', label: 'Fontes Bloqueadas', icon: <Shield className="w-5 h-5" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  { id: 'help', label: 'Ajuda e Suporte', icon: <HelpCircle className="w-5 h-5" /> },
];

interface ProfileScreenProps {
  user?: AuthUser | null;
  profile?: Profile | null;
  onLoginClick: () => void;
}

const ProfileScreen = React.forwardRef<HTMLDivElement, ProfileScreenProps>(
  ({ user, profile, onLoginClick }, ref) => {
    const { signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Até logo!');
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Entre na sua conta</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Faça login para salvar notícias, personalizar seu feed e acessar todos os recursos do REalia.
        </p>
        <Button variant="hero" size="lg" onClick={onLoginClick}>
          <LogIn className="w-4 h-4 mr-2" />
          Entrar ou Cadastrar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {profile?.display_name || 'Usuário REalia'}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">--</p>
            <p className="text-xs text-muted-foreground">Notícias lidas</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">--</p>
            <p className="text-xs text-muted-foreground">Salvos</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">
              {profile?.interests?.length || 0}
            </p>
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
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-4 py-4 mt-4 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
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
  }
);

ProfileScreen.displayName = 'ProfileScreen';

export default ProfileScreen;
