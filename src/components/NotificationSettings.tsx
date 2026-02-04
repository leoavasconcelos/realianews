import React, { useState, forwardRef } from 'react';
import { Bell, Mail, Smartphone, Clock, Info } from 'lucide-react';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  userId: string;
  onClose?: () => void;
}

const timeOptions = [
  { value: '06:00', label: '06:00' },
  { value: '07:00', label: '07:00' },
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
  { value: '12:00', label: '12:00' },
  { value: '18:00', label: '18:00' },
  { value: '20:00', label: '20:00' },
];

const NotificationSettings = forwardRef<HTMLDivElement, NotificationSettingsProps>(
  ({ userId, onClose }, ref) => {
  const { settings, isLoading, updateSettings } = useNotificationSettings(userId);
  const {
    isSupported: isPushSupported,
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [isUpdating, setIsUpdating] = useState(false);

  const handleEmailToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    await updateSettings({ email_notifications_enabled: enabled });
    setIsUpdating(false);
  };

  const handlePushToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    
    if (enabled) {
      const success = await subscribe();
      if (!success) {
        toast.error('Não foi possível ativar notificações push');
      }
    } else {
      await unsubscribe();
      await updateSettings({ push_notifications_enabled: false });
    }
    
    setIsUpdating(false);
  };

  const handleTimeChange = async (time: string) => {
    setIsUpdating(true);
    await updateSettings({ notification_time: time });
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

    return (
      <div ref={ref} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            Configure como você quer receber atualizações
          </p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Resumo por E-mail</p>
            <p className="text-sm text-muted-foreground">
              Receba as principais notícias diariamente
            </p>
          </div>
        </div>
        <Switch
          checked={settings?.email_notifications_enabled ?? true}
          onCheckedChange={handleEmailToggle}
          disabled={isUpdating}
        />
      </div>

      {/* Push Notifications */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Notificações Push</p>
            <p className="text-sm text-muted-foreground">
              Alertas instantâneos no navegador
            </p>
            {!isPushSupported && (
              <p className="text-xs text-destructive mt-1">
                Não suportado neste navegador
              </p>
            )}
            {isPushSupported && permission === 'denied' && (
              <p className="text-xs text-destructive mt-1">
                Permissão negada. Ative nas configurações do navegador.
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={settings?.push_notifications_enabled ?? false}
          onCheckedChange={handlePushToggle}
          disabled={!isPushSupported || permission === 'denied' || isUpdating || isPushLoading}
        />
      </div>

      {/* Notification Time */}
      <div className="py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Clock className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Horário do Resumo</p>
            <p className="text-sm text-muted-foreground">
              Quando você quer receber o resumo diário
            </p>
          </div>
        </div>
        <Select
          value={settings?.notification_time ?? '08:00'}
          onValueChange={handleTimeChange}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o horário" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info Box */}
      <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            O resumo diário inclui as 5 principais notícias do mercado imobiliário,
            filtradas pelos seus interesses quando configurados.
          </p>
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      )}
      </div>
    );
  }
);

NotificationSettings.displayName = 'NotificationSettings';

export default NotificationSettings;
