
# Plano: Adicionar Login com Google e Apple

## Visão Geral
Implementar autenticação social permitindo que usuários façam login usando suas contas Google ou Apple (iCloud), além do método tradicional por email/senha já existente.

---

## O que será feito

### 1. Configurar Provedores OAuth
Utilizar a ferramenta de configuração do Lovable Cloud para habilitar:
- **Google OAuth** - Login com conta Google
- **Apple OAuth** - Login com conta Apple (iCloud)

### 2. Atualizar o Hook de Autenticação
Adicionar função `signInWithOAuth` ao hook `useAuth.ts`:
- Suporte para Google e Apple
- Integração com o módulo `lovable.auth`
- Tratamento de erros específicos

### 3. Redesenhar o Modal de Login
Atualizar `AuthModal.tsx` com:
- Botões estilizados para "Continuar com Google" e "Continuar com Apple"
- Separador visual "ou" entre login social e email
- Ícones oficiais do Google e Apple
- Estados de loading individuais para cada botão

---

## Layout do Novo Modal

```text
┌─────────────────────────────────────────┐
│  [Logo]              REalia         [X] │
├─────────────────────────────────────────┤
│                                         │
│  Entrar na sua conta                    │
│  Acesse seu feed personalizado          │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  [G]  Continuar com Google          ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  []  Continuar com Apple           ││
│  └─────────────────────────────────────┘│
│                                         │
│  ─────────── ou ───────────             │
│                                         │
│  [📧] seu@email.com                     │
│  [🔒] Sua senha                         │
│                                         │
│  [         Entrar         ]             │
│                                         │
│  Não tem uma conta? Cadastre-se         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo 1: `src/hooks/useAuth.ts`
Adicionar função para login OAuth:

```typescript
const signInWithOAuth = async (provider: 'google' | 'apple') => {
  const { lovable } = await import('@/integrations/lovable');
  const { error } = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: window.location.origin,
  });
  return { error };
};
```

### Arquivo 2: `src/components/AuthModal.tsx`
Adicionar:
- Botões de login social com ícones
- Estados de loading separados
- Handlers para cada provedor
- Estilização consistente com a marca

### Arquivo 3: Módulo Lovable (auto-gerado)
Será criado automaticamente via ferramenta:
- `src/integrations/lovable/index.ts`
- Configuração dos provedores OAuth

---

## Fluxo de Login Social

1. Usuário clica em "Continuar com Google/Apple"
2. Abre popup de autenticação do provedor
3. Usuário autoriza o acesso
4. Retorna ao app com sessão ativa
5. Trigger `handle_new_user` cria perfil automaticamente
6. Modal fecha e usuário está logado

---

## Estilização dos Botões

| Botão | Cor de Fundo | Cor do Texto | Borda |
|-------|-------------|--------------|-------|
| Google | Branco (`#ffffff`) | Cinza escuro (`#374151`) | Cinza claro |
| Apple | Preto (`#000000`) | Branco (`#ffffff`) | Nenhuma |

---

## Compatibilidade

- O trigger existente `handle_new_user` já funciona para OAuth
- Perfis serão criados com `display_name` do provedor OAuth
- Preferências (interesses, notificações) podem ser configuradas depois

---

## Passos de Implementação

1. Configurar Google OAuth via ferramenta do Cloud
2. Configurar Apple OAuth via ferramenta do Cloud
3. Atualizar `useAuth.ts` com função `signInWithOAuth`
4. Redesenhar `AuthModal.tsx` com botões sociais
5. Testar fluxo completo de login/cadastro
