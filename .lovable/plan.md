
# Correção Definitiva do Travamento na Inicialização

## Diagnóstico

Após análise detalhada dos logs e código, identifiquei **3 problemas principais** que podem estar causando o travamento:

### Problema 1: Warnings de forwardRef causando erros de renderização
Os logs mostram:
```
Warning: Function components cannot be given refs. Check the render method of `ProfileScreen`.
Warning: Function components cannot be given refs. Check the render method of `DialogContent`.
```

O `NotificationSettings` está sendo renderizado dentro de `DialogContent` sem usar `forwardRef`, o que pode causar problemas de renderização.

### Problema 2: Race condition no hook `useAuth`
O callback `onAuthStateChange` faz operações assíncronas que podem não completar antes de outros efeitos reagirem:
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  setUser(session?.user ?? null);
  if (session?.user) {
    // await assíncrono aqui...
  }
  setLoading(false); // Pode setar false antes do profile carregar
});
```

### Problema 3: Dependências do useEffect no Index.tsx
O `useMemo` de `preferredRegions` depende de `profile?.preferred_regions`, mas a leitura do localStorage acontece em cada render quando profile é null.

---

## Solução

### 1. Adicionar forwardRef ao NotificationSettings
**Arquivo:** `src/components/NotificationSettings.tsx`

Envolver o componente com `React.forwardRef` para eliminar o warning e possíveis problemas de renderização.

### 2. Separar estado de loading do auth e do profile
**Arquivo:** `src/hooks/useAuth.ts`

Garantir que `loading` só seja `false` quando tanto a sessão quanto o profile estejam completamente carregados.

### 3. Melhorar a lógica de inicialização de região
**Arquivo:** `src/pages/Index.tsx`

Usar um `useRef` para controlar a inicialização ao invés de estado, evitando loops de dependência.

---

## Mudanças Detalhadas

### `src/components/NotificationSettings.tsx`
```typescript
// Adicionar forwardRef
const NotificationSettings = React.forwardRef<HTMLDivElement, NotificationSettingsProps>(
  ({ userId, onClose }, ref) => {
    // ... código existente ...
    return (
      <div ref={ref} className="space-y-6">
        {/* ... */}
      </div>
    );
  }
);
NotificationSettings.displayName = 'NotificationSettings';
```

### `src/hooks/useAuth.ts`
```typescript
useEffect(() => {
  let isMounted = true;
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (!isMounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Buscar profile de forma síncrona com o auth state
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (isMounted && data) {
          setProfile(/* ... */);
        }
      } else {
        setProfile(null);
      }
      
      if (isMounted) {
        setLoading(false);
      }
    }
  );

  // Verificar sessão inicial
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!isMounted) return;
    if (!session?.user) {
      setLoading(false);
    }
  });

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### `src/pages/Index.tsx`
```typescript
// Usar useRef ao invés de useState para evitar re-renders
const regionInitializedRef = useRef(false);

useEffect(() => {
  if (authLoading) return;
  if (regionInitializedRef.current) return;
  
  regionInitializedRef.current = true;
  
  // Lógica de inicialização...
}, [authLoading, profile]);
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/NotificationSettings.tsx` | Adicionar `forwardRef` |
| `src/hooks/useAuth.ts` | Adicionar flag `isMounted` para evitar race conditions |
| `src/pages/Index.tsx` | Usar `useRef` ao invés de `useState` para `regionInitialized` |

---

## Resultado Esperado

1. Warnings de forwardRef eliminados
2. Nenhum loop de renderização ou travamento
3. Inicialização de auth e região funciona corretamente em todos os cenários
4. App funciona tanto com usuário logado quanto deslogado
