import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'moderator';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const hasAdminAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }

    let cancelled = false;
    setRolesLoading(true);

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (error) {
        console.error('[useAdminAuth] Error fetching roles:', error);
        setRoles([]);
      } else {
        const fetched = (data as UserRole[])?.map(r => r.role) || [];
        console.log('[useAdminAuth] Roles for user', user.id, '→', fetched);
        setRoles(fetched);
      }

      setRolesLoading(false);
    };

    fetchRoles();

    return () => { cancelled = true; };
  }, [user]);

  return {
    user,
    roles,
    isAdmin,
    isModerator,
    hasAdminAccess,
    loading: authLoading || rolesLoading,
  };
};
