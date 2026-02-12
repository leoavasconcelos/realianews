import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
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
    
    // Fetch current session first
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        // Process session if exists
        if (session?.user) {
          setUser(session.user);
          setProfileLoading(true);
          
          try {
            console.log('Fetching profile for user:', session.user.id);
            const { data, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            console.log('Profile fetch result:', { data, error: fetchError });
            
            if (!isMounted) return;
            
            if (fetchError) {
              console.error('Error fetching profile:', fetchError);
              setProfile(null);
              setProfileLoading(false);
            } else if (data) {
              console.log('Profile data found:', data);
              const profileData: Profile = {
                ...data,
                interests: Array.isArray(data.interests) ? data.interests as string[] : [],
                blocked_sources: Array.isArray(data.blocked_sources) ? data.blocked_sources as string[] : [],
                preferred_regions: Array.isArray(data.preferred_regions) ? data.preferred_regions as string[] : ['Brazil'],
              };
              setProfile(profileData);
              setProfileLoading(false);
            } else {
              // No profile record exists - set null but continue (profile might not be created yet)
              console.log('No profile found for user:', session.user.id);
              setProfile(null);
              setProfileLoading(false);
            }
          } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
            if (isMounted) setProfileLoading(false);
          }
          
          if (isMounted) {
            setAuthLoading(false);
          }
        } else {
          // No session
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('Error in initSession:', err);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setAuthLoading(false);
      }
    };
    
    // Initialize with current session
    initSession();
    
    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser && (event === 'SIGNED_IN')) {
          // User just signed in - fetch profile
          setProfileLoading(true);
          
          try {
            const { data, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', currentUser.id)
              .maybeSingle();
            
            if (!isMounted) return;
            
            if (fetchError) {
              console.error('Error fetching profile:', fetchError);
              setProfile(null);
              setProfileLoading(false);
            } else if (data) {
              const profileData: Profile = {
                ...data,
                interests: Array.isArray(data.interests) ? data.interests as string[] : [],
                blocked_sources: Array.isArray(data.blocked_sources) ? data.blocked_sources as string[] : [],
                preferred_regions: Array.isArray(data.preferred_regions) ? data.preferred_regions as string[] : ['Brazil'],
              };
              
              // Sync localStorage preferences on new sign in
              const storedInterests = localStorage.getItem('realia_interests');
              const storedRegions = localStorage.getItem('realia_preferred_regions');
              
              const updates: Partial<Profile> = {};
              
              if (storedInterests) {
                try {
                  const parsedInterests = JSON.parse(storedInterests) as string[];
                  if (parsedInterests.length > 0 && profileData.interests.length === 0) {
                    updates.interests = parsedInterests;
                    profileData.interests = parsedInterests;
                  }
                } catch { /* ignore parse error */ }
                localStorage.removeItem('realia_interests');
              }
              
              if (storedRegions) {
                try {
                  const parsedRegions = JSON.parse(storedRegions) as string[];
                  if (parsedRegions.length > 0 && 
                      (profileData.preferred_regions.length === 0 || 
                       (profileData.preferred_regions.length === 1 && profileData.preferred_regions[0] === 'Brazil'))) {
                    updates.preferred_regions = parsedRegions;
                    profileData.preferred_regions = parsedRegions;
                  }
                } catch { /* ignore parse error */ }
                localStorage.removeItem('realia_preferred_regions');
              }
              
              if (Object.keys(updates).length > 0) {
                await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('user_id', currentUser.id);
              }
              
              setProfile(profileData);
              setProfileLoading(false);
            } else {
              // No profile found
              console.log('No profile found on sign in for user:', currentUser.id);
              setProfile(null);
              setProfileLoading(false);
            }
          } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
            if (isMounted) setProfileLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

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
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=password_recovery`,
    });
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'interests' | 'blocked_sources' | 'preferred_regions'>>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      
      if (error) {
        return { error };
      }
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    return await lovable.auth.signInWithOAuth(provider);
  };

  return {
    user,
    profile,
    loading,
    authLoading,
    profileLoading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };
};
