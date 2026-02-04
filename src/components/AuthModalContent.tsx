import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Logo from './Logo';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { validatePassword } from '@/lib/passwordValidation';
import { toast } from 'sonner';

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Apple icon component
const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

interface AuthModalContentProps {
  inline?: boolean;
  onSuccess?: () => void;
}

const AuthModalContent: React.FC<AuthModalContentProps> = ({ 
  inline = false, 
  onSuccess 
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, signInWithOAuth, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength on signup
    if (mode === 'signup') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        toast.error('Senha fraca', {
          description: passwordValidation.errors.join(', '),
        });
        return;
      }
    }
    
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Bem-vindo de volta!');
        onSuccess?.();
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast.success('Conta criada com sucesso!');
        onSuccess?.();
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setResetEmailSent(true);
        toast.success('Email de recuperação enviado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    const setProviderLoading = provider === 'google' ? setLoadingGoogle : setLoadingApple;
    setProviderLoading(true);

    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw error;
      // OAuth redirect will happen, no need to call onSuccess
    } catch (error: any) {
      toast.error(error.message || `Erro ao conectar com ${provider === 'google' ? 'Google' : 'Apple'}`);
      setProviderLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setMode('login');
    setResetEmailSent(false);
  };

  // Forgot password screen
  if (mode === 'forgot') {
    return (
      <div className={inline ? 'w-full' : ''}>
        {/* Back button */}
        <button
          onClick={handleBackToLogin}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {resetEmailSent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Email enviado!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>
            <Button variant="outline" onClick={handleBackToLogin} className="w-full">
              Voltar para o login
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Esqueceu sua senha?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enviar link de recuperação'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={inline ? 'w-full' : ''}>
      {!inline && <Logo size="sm" className="mb-4" />}
      
      <h2 className="text-xl font-bold text-foreground mb-2">
        {mode === 'login' ? 'Entrar na sua conta' : 'Criar uma conta'}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {mode === 'login' 
          ? 'Acesse seu feed personalizado e itens salvos' 
          : 'Personalize seu feed e salve suas notícias favoritas'}
      </p>

      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 bg-background hover:bg-muted text-foreground border-border"
          onClick={() => handleOAuthSignIn('google')}
          disabled={loadingGoogle || loadingApple}
        >
          {loadingGoogle ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span className="ml-2">Continuar com Google</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background"
          onClick={() => handleOAuthSignIn('apple')}
          disabled={loadingGoogle || loadingApple}
        >
          {loadingApple ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <AppleIcon />
              <span className="ml-2">Continuar com Apple</span>
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Seu nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              minLength={8}
            />
          </div>
          {mode === 'signup' && password && (
            <PasswordStrengthIndicator password={password} />
          )}
        </div>

        {mode === 'login' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        <Button
          type="submit"
          variant="hero"
          className="w-full"
          disabled={loading || loadingGoogle || loadingApple}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'login' ? (
            'Entrar'
          ) : (
            'Criar Conta'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === 'login' 
            ? 'Não tem uma conta? Cadastre-se' 
            : 'Já tem uma conta? Entre'}
        </button>
      </div>

    </div>
  );
};

export default AuthModalContent;
