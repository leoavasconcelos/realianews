import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { RegionFilter as RegionFilterType } from '@/hooks/useNews';

// Synchronous localStorage read - stable across hot reloads
const getStoredRegions = (): string[] | null => {
  try {
    const stored = localStorage.getItem('realia_preferred_regions');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export function useAppBootstrap(setActiveRegion: (region: RegionFilterType) => void) {
  const { user, profile, authLoading, updateProfile, updatePassword } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const localStorageComplete = localStorage.getItem('realia_onboarding_complete');

    if (localStorageComplete) {
      setShowOnboarding(false);
      return;
    }

    if (user && profile) {
      if (profile.interests && profile.interests.length > 0) {
        localStorage.setItem('realia_onboarding_complete', 'true');
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } else if (!user) {
      setShowOnboarding(true);
    }
  }, [authLoading, user, profile]);

  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [user, showAuthModal]);

  const storedRegionsRef = useRef<string[] | null>(getStoredRegions());
  const regionInitializedRef = useRef(false);

  const preferredRegions = useMemo(() => {
    if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
      return profile.preferred_regions;
    }
    return storedRegionsRef.current || ['Brazil'];
  }, [profile?.preferred_regions]);

  useEffect(() => {
    if (authLoading) return;
    if (regionInitializedRef.current) return;

    regionInitializedRef.current = true;

    if (preferredRegions.length === 1) {
      setActiveRegion(preferredRegions[0] as RegionFilterType);
    }
  }, [authLoading, preferredRegions, setActiveRegion]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      setTimeout(() => {
        setShowPasswordReset(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = async (interests: string[], newPreferredRegions: string[]) => {
    localStorage.setItem('realia_onboarding_complete', 'true');
    setShowOnboarding(false);

    localStorage.setItem('realia_preferred_regions', JSON.stringify(newPreferredRegions));

    if (user) {
      await updateProfile({ interests, preferred_regions: newPreferredRegions });
      toast.success('Feed personalizado!', {
        description: `Seu feed foi configurado com ${interests.length} interesses.`,
      });
    } else if (interests.length > 0) {
      localStorage.setItem('realia_interests', JSON.stringify(interests));
      toast.success('Preferências salvas!', {
        description: 'Faça login para sincronizar suas preferências.',
      });
    }
  };

  return {
    user,
    profile,
    authLoading,
    updateProfile,
    updatePassword,
    showOnboarding,
    setShowOnboarding,
    showAuthModal,
    setShowAuthModal,
    showPasswordReset,
    setShowPasswordReset,
    preferredRegions,
    handleOnboardingComplete,
  };
}