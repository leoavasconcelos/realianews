import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, User, Mail, Globe, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

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
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles?.map((profile) => {
                    const regions = Array.isArray(profile.preferred_regions) 
                      ? profile.preferred_regions 
                      : [];
                    const interests = Array.isArray(profile.interests) 
                      ? profile.interests 
                      : [];

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
                        <TableCell>
                          {savedCounts?.[profile.user_id] || 0}
                        </TableCell>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Ver detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <User className="h-5 w-5" />
                                  {profile.display_name || 'Usuário'}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Regiões Preferidas
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {regions.length > 0 ? regions.map((region, i) => (
                                      <Badge key={i} variant="secondary">{region}</Badge>
                                    )) : (
                                      <span className="text-muted-foreground text-sm">Nenhuma região selecionada</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Interesses</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {interests.length > 0 ? interests.map((interest, i) => (
                                      <Badge key={i} variant="outline">{interest}</Badge>
                                    )) : (
                                      <span className="text-muted-foreground text-sm">Nenhum interesse selecionado</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Notificações Email</p>
                                    <p className="font-medium">
                                      {profile.email_notifications_enabled ? 'Ativadas' : 'Desativadas'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Notificações Push</p>
                                    <p className="font-medium">
                                      {profile.push_notifications_enabled ? 'Ativadas' : 'Desativadas'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Itens Salvos</p>
                                    <p className="font-medium">{savedCounts?.[profile.user_id] || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Cadastrado em</p>
                                    <p className="font-medium">
                                      {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
    </AdminGuard>
  );
};
