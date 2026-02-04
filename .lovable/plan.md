
# Correção dos Problemas de Travamento, Logout e Preferências

## Diagnóstico Completo

Após análise detalhada do código e testes no browser, identifiquei **3 problemas principais**:

### Problema 1: Estado "stale" no localStorage do iframe
O iframe do Lovable preserva o localStorage entre edições de código, mas o estado pode ficar inconsistente quando:
- O usuário está logado mas a sessão expirou
- Os dados de preferências são de uma versão anterior do código
- O `regionInitializedRef` foi resetado mas o localStorage mantém dados antigos

### Problema 2: useMemo criando novos arrays a cada render
O `useMemo` de `preferredRegions` (linhas 93-106 do Index.tsx) chama `JSON.parse()` quando `profile` é undefined. Cada chamada a `JSON.parse()` cria um **novo array**, mesmo com os mesmos valores. Isso invalida a queryKey do React Query (`['news', activeFilter, activeRegion, preferredRegions]`), causando re-fetches infinitos.

### Problema 3: Função signOut não está limpando estado corretamente
Quando o usuário faz logout, a função `signOut` em `useAuth.ts` não limpa explicitamente o estado local (`user` e `profile`), dependendo apenas do `onAuthStateChange`. Se houver atraso ou falha nesse callback, o UI fica em estado inconsistente.

---

## Solução

### Arquivo 1: `src/pages/Index.tsx`

**Problema**: O `useMemo` de `preferredRegions` cria novos arrays a cada render quando lê do localStorage.

**Solução**: Armazenar o valor do localStorage em um `useRef` para evitar recriação do array.

```typescript
// Antes (problemático)
const preferredRegions = useMemo(() => {
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    return profile.preferred_regions;
  }
  const stored = localStorage.getItem('realia_preferred_regions');
  if (stored) {
    try {
      return JSON.parse(stored) as string[]; // Novo array a cada render!
    } catch {
      return undefined;
    }
  }
  return undefined;
}, [profile?.preferred_regions]);

// Depois (corrigido)
const storedRegionsRef = useRef<string[] | undefined>(undefined);

// Inicializar ref do localStorage apenas uma vez
useEffect(() => {
  if (storedRegionsRef.current === undefined) {
    const stored = localStorage.getItem('realia_preferred_regions');
    if (stored) {
      try {
        storedRegionsRef.current = JSON.parse(stored);
      } catch {
        storedRegionsRef.current = undefined;
      }
    }
  }
}, []);

const preferredRegions = useMemo(() => {
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    return profile.preferred_regions;
  }
  return storedRegionsRef.current;
}, [profile?.preferred_regions]);
```

### Arquivo 2: `src/hooks/useAuth.ts`

**Problema**: A função `signOut` não limpa o estado local imediatamente.

**Solução**: Limpar `user` e `profile` antes de chamar o signOut do Supabase.

```typescript
// Antes
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Depois
const signOut = async () => {
  // Limpar estado local imediatamente para feedback instantâneo
  setUser(null);
  setProfile(null);
  
  const { error } = await supabase.auth.signOut();
  return { error };
};
```

### Arquivo 3: `src/pages/Index.tsx` (adicional)

**Problema**: O `regionInitializedRef` é resetado quando o componente remonta (por exemplo, após refresh/rebuild), mas as preferências já existem.

**Solução**: Usar uma chave mais robusta no localStorage para detectar se já foi inicializado na sessão atual.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Index.tsx` | Usar `useRef` para armazenar preferredRegions do localStorage e evitar recriação de arrays |
| `src/hooks/useAuth.ts` | Limpar estado local imediatamente no signOut para feedback instantâneo |

---

## Solução Imediata para Desbloquear

Se o usuário estiver travado, ele pode executar o seguinte no console do browser (F12):

```javascript
localStorage.clear();
window.location.reload();
```

Isso limpará todos os dados persistidos e permitirá um fresh start.

---

## Resultado Esperado

1. Feed não fica mais em loading infinito
2. Logout funciona imediatamente e limpa o estado
3. Preferências são salvas e carregadas corretamente
4. App funciona consistentemente tanto no iframe quanto em nova aba
