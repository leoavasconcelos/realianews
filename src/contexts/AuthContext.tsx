import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<any>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: any }>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'interests' | 'blocked_sources' | 'preferred_regions'>>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loading = authLoading || profileLoading;

  const parseProfileData = (data: any): Profile => ({
    ...data,
    interests: Array.isArray(data.interests) ? data.interests as string[] : [],
    blocked_sources: Array.isArray(data.blocked_sources) ? data.blocked_sources as string[] : [],
    preferred_regions: Array.isArray(data.preferred_regions) ? data.preferred_regions as string[] : ['Brazil'],
  });

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data ? parseProfileData(data) : null;
  };

  const syncLocalStoragePreferences = async (userId: string, profileData: Profile): Promise<Profile> => {
    const storedInterests = localStorage.getItem('realia_interests');
    const storedRegions = localStorage.getItem('realia_preferred_regions');
    const updates: Partial<Profile> = {};

    if (storedInterests) {
      try {
        const parsed = JSON.parse(storedInterests) as string[];
        if (parsed.length > 0 && profileData.interests.length === 0) {
          updates.interests = parsed;
          profileData.interests = parsed;
        }
      } catch { /* ignore */ }
      localStorage.removeItem('realia_interests');
    }

    if (storedRegions) {
      try {
        const parsed = JSON.parse(storedRegions) as string[];
        if (parsed.length > 0 &&
          (profileData.preferred_regions.length === 0 ||
            (profileData.preferred_regions.length === 1 && profileData.preferred_regions[0] === 'Brazil'))) {
          updates.preferred_regions = parsed;
          profileData.preferred_regions = parsed;
        }
      } catch { /* ignore */ }
      localStorage.removeItem('realia_preferred_regions');
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('user_id', userId);
    }

    return profileData;
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          setProfileLoading(true);
          const profileData = await fetchProfile(session.user.id);
          if (!isMounted) return;
          setProfile(profileData);
          setProfileLoading(false);
        } else {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      } catch (err) {
        console.error('Error in initSession:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser && event === 'SIGNED_IN') {
          setProfileLoading(true);
          try {
            let profileData = await fetchProfile(currentUser.id);
            if (!isMounted) return;
            if (profileData) {
              profileData = await syncLocalStoragePreferences(currentUser.id, profileData);
            }
            setProfile(profileData);
          } catch (err) {
            console.error('Error fetching profile on sign in:', err);
            if (isMounted) setProfile(null);
          } finally {
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
        data: { display_name: displayName },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=password_recovery`,
    });
  };

  const updatePassword = async (newPassword: string) => {
    return await supabase.auth.updateUser({ password: newPassword });
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'interests' | 'blocked_sources' | 'preferred_regions'>>) => {
    if (!user) return { error: new Error('No user logged in') };
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (!error) {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
      }
      return { error: error ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    return await lovable.auth.signInWithOAuth(provider);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, authLoading, profileLoading,
      signUp, signIn, signInWithOAuth, signOut,
      resetPassword, updatePassword, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
