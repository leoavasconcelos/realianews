import React, { useState, useRef } from 'react';
import { Loader2, Camera, Sun, Moon, Inbox } from 'lucide-react';
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
  LogIn,
  Globe,
  Check,
  Home,
  Building2,
  Briefcase,
  Landmark,
  TrendingUp,
  Cpu,
  Brain,
  Lock
} from 'lucide-react';
import BlockedSourcesDialog from './BlockedSourcesDialog';
import SettingsDialog from './SettingsDialog';
import HelpDialog from './HelpDialog';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useAuth, Profile } from '@/hooks/useAuth';
import { useSavedItems, useReadNewsCount } from '@/hooks/useNews';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import NotificationSettings from './NotificationSettings';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onClick?: () => void;
}

interface Region {
  id: string;
  label: string;
  description: string;
  flag: string;
}

interface Interest {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const allInterests: Interest[] = [
  { id: 'residencial', label: 'Residencial', icon: <Home className="w-5 h-5" />, description: 'Casas, apartamentos e lançamentos' },
  { id: 'comercial', label: 'Comercial', icon: <Building2 className="w-5 h-5" />, description: 'Escritórios, lojas e galpões' },
  { id: 'corporativo', label: 'Corporativo', icon: <Briefcase className="w-5 h-5" />, description: 'M&A, fundos e grandes players' },
  { id: 'financiamento', label: 'Financiamento', icon: <Landmark className="w-5 h-5" />, description: 'Crédito, taxas e bancos' },
  { id: 'investimentos', label: 'Investimentos', icon: <TrendingUp className="w-5 h-5" />, description: 'FIIs, CRIs e oportunidades' },
  { id: 'proptech', label: 'PropTech', icon: <Cpu className="w-5 h-5" />, description: 'Startups e inovação digital' },
  { id: 'ia-imobiliaria', label: 'IA Imobiliária', icon: <Brain className="w-5 h-5" />, description: 'Machine learning e automação' },
];

const allRegions: Region[] = [
  { id: 'Brazil', label: 'Brasil', description: 'Notícias nacionais', flag: '🇧🇷' },
  { id: 'USA', label: 'EUA', description: 'Estados Unidos', flag: '🇺🇸' },
  { id: 'Europe', label: 'Europa', description: 'Reino Unido, Alemanha, França...', flag: '🇪🇺' },
  { id: 'Middle East', label: 'Oriente Médio', description: 'Dubai, Arábia Saudita...', flag: '🇦🇪' },
  { id: 'World', label: 'Mundo', description: 'Ásia, Oceania, consultorias globais', flag: '🌍' },
];

interface ProfileScreenProps {
  user?: AuthUser | null;
  profile?: Profile | null;
  onLoginClick: () => void;
  onNotificationCenterClick?: () => void;
  onSavedClick?: () => void;
  updateProfile?: (updates: Partial<Pick<Profile, 'display_name' | 'interests' | 'blocked_sources' | 'preferred_regions'>>) => Promise<{ error: Error | null }>;
  updatePassword?: (newPassword: string) => Promise<{ data: any; error: any }>;
}

const ProfileScreen = React.forwardRef<HTMLDivElement, ProfileScreenProps>(
  ({ user, profile, onLoginClick, onNotificationCenterClick, onSavedClick, updateProfile: updateProfileProp, updatePassword: updatePasswordProp }, ref) => {
    const navigate = useNavigate();
    const { signOut, updateProfile: updateProfileFallback, updatePassword: updatePasswordFallback } = useAuth();
    const updateProfile = updateProfileProp || updateProfileFallback;
    const updatePassword = updatePasswordProp || updatePasswordFallback;
    const { hasAdminAccess, isAdmin } = useAdminAuth();
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [regionsOpen, setRegionsOpen] = useState(false);
    const [interestsOpen, setInterestsOpen] = useState(false);
    const [blockedOpen, setBlockedOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [savingRegions, setSavingRegions] = useState(false);
    const [savingInterests, setSavingInterests] = useState(false);
    const { data: savedItems } = useSavedItems(user?.id);
    const savedItemsCount = savedItems?.length || 0;
    const { data: readCount } = useReadNewsCount(user?.id);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setUploadingAvatar(true);
      try {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        // Add cache buster to force refresh
        const url = `${publicUrl}?t=${Date.now()}`;
        await updateProfile({ avatar_url: url } as any);
        toast.success('Foto de perfil atualizada!');
      } catch (err) {
        console.error('Avatar upload error:', err);
        toast.error('Erro ao enviar foto');
      } finally {
        setUploadingAvatar(false);
      }
    };

    const handleOpenRegions = () => {
      setSelectedRegions(profile?.preferred_regions || ['Brazil']);
      setRegionsOpen(true);
    };

    const handleOpenInterests = () => {
      setSelectedInterests(profile?.interests || []);
      setInterestsOpen(true);
    };

    const toggleRegion = (id: string) => {
      setSelectedRegions((prev) => {
        // Brazil is always required
        if (id === 'Brazil') return prev;
        return prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      });
    };

    const toggleInterest = (id: string) => {
      setSelectedInterests((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    };

    const handleSaveRegions = async () => {
      setSavingRegions(true);
      const { error } = await updateProfile({ preferred_regions: selectedRegions });
      setSavingRegions(false);
      
      if (error) {
        toast.error('Erro ao salvar preferências');
      } else {
        toast.success('Preferências de região atualizadas!');
        setRegionsOpen(false);
      }
    };

    const handleSaveInterests = async () => {
      setSavingInterests(true);
      const { error } = await updateProfile({ interests: selectedInterests });
      setSavingInterests(false);
      
      if (error) {
        toast.error('Erro ao salvar interesses');
      } else {
        toast.success('Interesses atualizados!');
        setInterestsOpen(false);
      }
    };

    const menuItems: MenuItem[] = [
      { id: 'saved', label: 'Salvos', icon: <Bookmark className="w-5 h-5" />, onClick: onSavedClick },
      { id: 'notif-center', label: 'Central de Notificações', icon: <Inbox className="w-5 h-5" />, onClick: onNotificationCenterClick },
      { id: 'interests', label: 'Meus Interesses', icon: <Heart className="w-5 h-5" />, onClick: handleOpenInterests },
      { id: 'regions', label: 'Regiões de Interesse', icon: <Globe className="w-5 h-5" />, onClick: handleOpenRegions },
      { id: 'notifications', label: 'Preferências de Notificação', icon: <Bell className="w-5 h-5" />, onClick: () => setNotificationsOpen(true) },
      { id: 'blocked', label: 'Fontes Bloqueadas', icon: <Shield className="w-5 h-5" />, onClick: () => setBlockedOpen(true) },
      { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" />, onClick: () => setSettingsOpen(true) },
      { id: 'help', label: 'Ajuda e Suporte', icon: <HelpCircle className="w-5 h-5" />, onClick: () => setHelpOpen(true) },
      ...(hasAdminAccess ? [{ id: 'admin', label: 'Painel Administrativo', icon: <Lock className="w-5 h-5" />, onClick: () => navigate('/admin') }] : []),
    ];

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

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const regionCount = (profile?.preferred_regions?.length || 1);

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
           <button 
             onClick={() => fileInputRef.current?.click()} 
             className="relative group"
             disabled={uploadingAvatar}
           >
             <Avatar className="w-16 h-16">
               <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
               <AvatarFallback className="bg-gradient-hero">
                 <User className="w-8 h-8 text-white" />
               </AvatarFallback>
             </Avatar>
             <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               {uploadingAvatar ? (
                 <Loader2 className="w-5 h-5 text-white animate-spin" />
               ) : (
                 <Camera className="w-5 h-5 text-white" />
               )}
             </div>
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               className="hidden"
               onChange={handleAvatarUpload}
             />
           </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {profile?.display_name || 'Usuário REalia'}
              </h1>
              {hasAdminAccess && (
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" />
                  {isAdmin ? 'Admin' : 'Moderador'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">{readCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Notícias lidas</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-foreground">{savedItemsCount}</p>
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
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="text-muted-foreground">{item.icon}</div>
              <span className="flex-1 text-left font-medium text-foreground">
                {item.label}
              </span>
              {item.id === 'interests' && (
                <span className="text-xs text-muted-foreground">
                  {profile?.interests?.length || 0} selecionados
                </span>
              )}
              {item.id === 'regions' && (
                <span className="text-xs text-muted-foreground">
                  {regionCount} {regionCount === 1 ? 'região' : 'regiões'}
                </span>
              )}
              {item.badge && (
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Dark Mode Toggle */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden mt-4">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors"
          >
            <div className="text-muted-foreground">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <span className="flex-1 text-left font-medium text-foreground">
              Modo Escuro
            </span>
            <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
              isDark ? 'bg-primary justify-end' : 'bg-muted justify-start'
            }`}>
              <div className="w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-200" />
            </div>
          </button>
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

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Configurações de Notificações</DialogTitle>
          </DialogHeader>
          {user && (
            <NotificationSettings 
              userId={user.id} 
              onClose={() => setNotificationsOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Regions Dialog */}
      <Dialog open={regionsOpen} onOpenChange={setRegionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Regiões de Interesse
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione as regiões cujas notícias você deseja acompanhar. Brasil está sempre incluído.
            </p>
            
            <div className="space-y-2">
              {allRegions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => toggleRegion(region.id)}
                  disabled={region.id === 'Brazil'}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedRegions.includes(region.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  } ${region.id === 'Brazil' ? 'opacity-75' : ''}`}
                >
                  <span className="text-2xl">{region.flag}</span>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground text-sm">
                      {region.label}
                      {region.id === 'Brazil' && (
                        <span className="text-xs text-muted-foreground ml-2">(sempre ativo)</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{region.description}</p>
                  </div>
                  {selectedRegions.includes(region.id) && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setRegionsOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="hero" 
              className="flex-1"
              onClick={handleSaveRegions}
              disabled={savingRegions}
            >
              {savingRegions ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interests Dialog */}
      <Dialog open={interestsOpen} onOpenChange={setInterestsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Meus Interesses
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione os temas do mercado imobiliário que você deseja acompanhar.
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {allInterests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedInterests.includes(interest.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  {selectedInterests.includes(interest.id) && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`mb-1.5 ${selectedInterests.includes(interest.id) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {interest.icon}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">
                    {interest.label}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {interest.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setInterestsOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="hero" 
              className="flex-1"
              onClick={handleSaveInterests}
              disabled={savingInterests}
            >
              {savingInterests ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Sources Dialog */}
      <BlockedSourcesDialog
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        blockedSources={profile?.blocked_sources || []}
        updateProfile={updateProfile}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        displayName={profile?.display_name || null}
        updateProfile={updateProfile}
        updatePassword={updatePassword}
      />

      {/* Help Dialog */}
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
    );
  }
);

ProfileScreen.displayName = 'ProfileScreen';

export default ProfileScreen;
