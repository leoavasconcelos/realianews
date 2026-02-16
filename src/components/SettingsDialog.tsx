import React, { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string | null;
  updateProfile: (updates: { display_name: string }) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: any }>;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open, onOpenChange, displayName, updateProfile, updatePassword,
}) => {
  const [name, setName] = useState(displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }
    setSavingName(true);
    const { error } = await updateProfile({ display_name: name.trim() });
    setSavingName(false);
    if (error) {
      toast.error('Erro ao atualizar nome');
    } else {
      toast.success('Nome atualizado!');
    }
  };

  const handleChangePassword = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) {
      toast.error(error.message || 'Erro ao alterar senha');
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Reset fields when opening
  React.useEffect(() => {
    if (open) {
      setName(displayName || '');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open, displayName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Display Name */}
          <div className="space-y-3">
            <Label htmlFor="display-name" className="text-sm font-semibold">
              Nome de exibição
            </Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
              <Button
                variant="hero"
                onClick={handleSaveName}
                disabled={savingName || name.trim() === (displayName || '')}
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Change Password */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Alterar senha</Label>
            <div className="space-y-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha"
              />
              {newPassword && <PasswordStrengthIndicator password={newPassword} />}
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
              />
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
