import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  interests: string[];
  preferred_regions: string[];
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
}

interface UserEditModalProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_REGIONS = [
  'Brazil', 'Latin America', 'North America', 'Europe', 'Asia', 'Africa', 'Oceania',
];

export const UserEditModal = ({ profile, open, onOpenChange }: UserEditModalProps) => {
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('name, slug');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setSelectedInterests(Array.isArray(profile.interests) ? profile.interests : []);
      setSelectedRegions(Array.isArray(profile.preferred_regions) ? profile.preferred_regions : []);
      setEmailNotif(profile.email_notifications_enabled);
      setPushNotif(profile.push_notifications_enabled);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          interests: selectedInterests,
          preferred_regions: selectedRegions,
          email_notifications_enabled: emailNotif,
          push_notifications_enabled: pushNotif,
        })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Perfil atualizado com sucesso' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    },
  });

  const toggleInterest = (slug: string) => {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((i) => i !== slug) : [...prev, slug]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nome de exibição</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome do usuário"
            />
          </div>

          <div className="space-y-2">
            <Label>Regiões preferidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_REGIONS.map((region) => (
                <label key={region} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedRegions.includes(region)}
                    onCheckedChange={() => toggleRegion(region)}
                  />
                  {region}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interesses</Label>
            <div className="grid grid-cols-2 gap-2">
              {topics?.map((topic) => (
                <label key={topic.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedInterests.includes(topic.slug)}
                    onCheckedChange={() => toggleInterest(topic.slug)}
                  />
                  {topic.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Notificações</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email</span>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Push</span>
              <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
