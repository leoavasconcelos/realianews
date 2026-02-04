import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  interests: string[];
  blocked_sources: string[];
  preferred_regions: string[];
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Combined loading state - only false when BOTH auth and profile are resolved
  const loading = authLoading || profileLoading;

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Start profile loading
          setProfileLoading(true);
          
          // Fetch profile
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (!isMounted) return;
          
          if (data) {
            const profileData: Profile = {
              ...data,
              interests: Array.isArray(data.interests) ? data.interests as string[] : [],
              blocked_sources: Array.isArray(data.blocked_sources) ? data.blocked_sources as string[] : [],
              preferred_regions: Array.isArray(data.preferred_regions) ? data.preferred_regions as string[] : ['Brazil'],
            };
            
            // Sync localStorage preferences on login
            if (event === 'SIGNED_IN') {
              const storedInterests = localStorage.getItem('realia_interests');
              const storedRegions = localStorage.getItem('realia_preferred_regions');
              
              const updates: Partial<Profile> = {};
              
              // Only sync if profile has default/empty values and localStorage has data
              if (storedInterests) {
                const parsedInterests = JSON.parse(storedInterests) as string[];
                if (parsedInterests.length > 0 && profileData.interests.length === 0) {
                  updates.interests = parsedInterests;
                  profileData.interests = parsedInterests;
                }
                localStorage.removeItem('realia_interests');
              }
              
              if (storedRegions) {
                const parsedRegions = JSON.parse(storedRegions) as string[];
                // Sync if profile only has default Brazil and localStorage has more
                if (parsedRegions.length > 0 && 
                    (profileData.preferred_regions.length === 0 || 
                     (profileData.preferred_regions.length === 1 && profileData.preferred_regions[0] === 'Brazil'))) {
                  updates.preferred_regions = parsedRegions;
                  profileData.preferred_regions = parsedRegions;
                }
                localStorage.removeItem('realia_preferred_regions');
              }
              
              // Update profile in database if there are changes
              if (Object.keys(updates).length > 0) {
                await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('user_id', session.user.id);
              }
            }
            
            setProfile(profileData);
          }
          
          if (isMounted) {
            setProfileLoading(false);
          }
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
        
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    // Clear local state immediately for instant UI feedback
    setUser(null);
    setProfile(null);
    
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'interests' | 'blocked_sources' | 'preferred_regions'>>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    const { lovable } = await import('@/integrations/lovable');
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    return { error };
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithOAuth,
    resetPassword,
    updatePassword,
    updateProfile,
  };
};
