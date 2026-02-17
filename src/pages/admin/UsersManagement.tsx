import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { UserEditModal } from '@/components/admin/UserEditModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, User, Mail, Bell, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  interests: string[];
  preferred_regions: string[];
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
}

export const UsersManagement = () => {
  const queryClient = useQueryClient();
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: savedCounts } = useQuery({
    queryKey: ['admin-saved-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_saved_items')
        .select('user_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.user_id] = (counts[item.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-saved-counts'] });
      toast({ title: 'Usuário excluído com sucesso' });
      setDeleteProfile(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Erro ao excluir usuário', variant: 'destructive' });
    },
  });

  return (
    <AdminGuard requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Usuários</h1>
          <Badge variant="secondary">{profiles?.length || 0} usuários</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Regiões</TableHead>
                    <TableHead>Interesses</TableHead>
                    <TableHead>Salvos</TableHead>
                    <TableHead>Notificações</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles?.map((profile) => {
                    const regions = Array.isArray(profile.preferred_regions) ? profile.preferred_regions : [];
                    const interests = Array.isArray(profile.interests) ? profile.interests : [];

                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">
                              {profile.display_name || 'Usuário'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {regions.length} {regions.length === 1 ? 'região' : 'regiões'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {interests.length} {interests.length === 1 ? 'interesse' : 'interesses'}
                          </Badge>
                        </TableCell>
                        <TableCell>{savedCounts?.[profile.user_id] || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className={`h-4 w-4 ${profile.email_notifications_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                            <Bell className={`h-4 w-4 ${profile.push_notifications_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(profile.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditProfile(profile)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteProfile(profile)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {profiles?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <UserEditModal
        profile={editProfile}
        open={!!editProfile}
        onOpenChange={(open) => { if (!open) setEditProfile(null); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProfile} onOpenChange={(open) => { if (!open) setDeleteProfile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o usuário{' '}
              <strong>{deleteProfile?.display_name || 'este usuário'}</strong>?
              Esta ação não pode ser desfeita. Todos os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProfile && deleteMutation.mutate(deleteProfile.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGuard>
  );
};
