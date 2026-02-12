import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
      isLoading: false,
    }));
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({ ...prev, error: 'Failed to request permission' }));
      return false;
    }
  }, [state.isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First request permission
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Permission denied' }));
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Service worker registration failed' }));
        return false;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get existing subscription or create new one
      const swReg = registration as any;
      let subscription = await swReg.pushManager.getSubscription();
      
      if (!subscription) {
        // For demo purposes, we're using a placeholder VAPID key
        // In production, you would generate your own VAPID keys
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as BufferSource,
        });
      }

      // Send subscription to backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-push-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'subscribe',
            subscription: subscription.toJSON(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subscription');
      }

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, [requestPermission, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const swReg = registration as any;
        const subscription = await swReg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Notify backend
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-push-subscription`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'unsubscribe' }),
          }
        );
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
