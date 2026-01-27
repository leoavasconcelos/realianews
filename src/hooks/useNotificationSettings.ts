import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  notification_time: string;
}

interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useNotificationSettings = (userId: string | undefined): UseNotificationSettingsReturn => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('email_notifications_enabled, push_notifications_enabled, notification_time')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setSettings({
          email_notifications_enabled: data.email_notifications_enabled,
          push_notifications_enabled: data.push_notifications_enabled,
          notification_time: data.notification_time,
        });
      } else {
        // Set defaults if no profile exists
        setSettings({
          email_notifications_enabled: true,
          push_notifications_enabled: false,
          notification_time: '08:00',
        });
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>): Promise<boolean> => {
    if (!userId) {
      toast.error('Você precisa estar logado para alterar as configurações');
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Configurações atualizadas!');
      return true;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      toast.error('Erro ao atualizar configurações');
      return false;
    }
  }, [userId]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
};
