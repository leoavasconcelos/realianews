import React, { useState } from 'react';
import { X, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PasswordInput } from './ui/password-input';
import Logo from './Logo';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { validatePassword } from '@/lib/passwordValidation';
import { toast } from 'sonner';

interface PasswordResetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { updatePassword } = useAuth();

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('Senha fraca', {
        description: passwordValidation.errors.join(', '),
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setSuccess(true);
      toast.success('Senha atualizada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl w-full max-w-md shadow-xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Logo size="sm" />
            <Button variant="ghost" size="icon" onClick={onSuccess}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Success Content */}
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Senha atualizada!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sua senha foi alterada com sucesso. Agora você pode usar sua nova senha para entrar.
            </p>
            <Button variant="hero" onClick={onSuccess} className="w-full">
              Continuar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Redefinir senha
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Digite sua nova senha abaixo. Ela deve ter pelo menos 8 caracteres, incluindo letras e números.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <PasswordInput
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
              {password && (
                <PasswordStrengthIndicator password={password} />
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <PasswordInput
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-destructive">
                As senhas não coincidem
              </p>
            )}

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={loading || password !== confirmPassword || !passwordValidation.isValid}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
