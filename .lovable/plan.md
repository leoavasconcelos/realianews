

## Problema

O `AuthContext` trava o carregamento da aplicação porque o callback `onAuthStateChange` é `async` e usa `await` internamente. Isso é um anti-padrão conhecido do Supabase: quando o callback faz chamadas assíncronas ao próprio cliente Supabase (como `fetchProfile` via `.from('profiles').select()` ou `supabase.rpc()`), pode ocorrer um deadlock no lock interno do GoTrue. O resultado: `authLoading` nunca vira `false`, o `useNews` fica desabilitado, nenhum request sai para o Supabase, e o feed gira eternamente.

## Solução

Refatorar `src/contexts/AuthContext.tsx` seguindo o padrão oficial recomendado pelo Supabase:

### 1. Tornar o callback de `onAuthStateChange` SÍNCRONO

O callback deve apenas atualizar o estado do `user` de forma síncrona. Qualquer operação assíncrona (fetch de profile, RPC de notificação, sync de localStorage) deve ser deferida com `setTimeout(() => {...}, 0)` para sair do contexto do callback.

### 2. Liberar `authLoading` imediatamente após a primeira detecção de sessão

O `authLoading` deve virar `false` assim que sabemos se há sessão ou não — não devemos esperar o profile carregar para liberar o app. O `profileLoading` continua existindo separadamente para componentes que precisam dele.

### 3. Estrutura corrigida

```text
useEffect:
  1. subscribe a onAuthStateChange (callback SÍNCRONO)
     - setUser(session?.user ?? null)
     - se SIGNED_IN → setTimeout(fetchProfileAndSync, 0)
     - se SIGNED_OUT → setProfile(null)
  2. getSession() inicial
     - setUser, setAuthLoading(false)
     - se houver user → setTimeout(fetchProfile, 0)
```

### 4. Remover bloqueio do feed

Validar em `useNews`/`Index.tsx` se há alguma `enabled` flag dependente de `profileLoading` que esteja segurando a query. A query do feed só deve depender de `authLoading` (ou nem isso, pois feed pode ser público).

## Arquivos afetados

- `src/contexts/AuthContext.tsx` — refatoração principal do `useEffect` e callbacks
- Possível ajuste em `src/hooks/useNews.ts` ou `src/pages/Index.tsx` se a query estiver gated por `loading` (combo de auth+profile) em vez de só `authLoading`

## Resultado esperado

- `authLoading` resolve em <100ms após mount
- Feed dispara request para Supabase imediatamente
- Profile carrega em paralelo sem bloquear renderização
- Sem deadlock, sem loading infinito

