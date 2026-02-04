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
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setRolesLoading(false);
        return;
      }

      setRolesLoading(true);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        setRoles((data as UserRole[])?.map(r => r.role) || []);
      }
      
      setRolesLoading(false);
    };

    if (!authLoading) {
      fetchRoles();
    }
  }, [user, authLoading]);

  return {
    user,
    roles,
    isAdmin,
    isModerator,
    hasAdminAccess,
    loading: authLoading || rolesLoading,
  };
};
