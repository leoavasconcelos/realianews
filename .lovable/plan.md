
# Correção Definitiva: Estado Inconsistente Após Hot Reload

## Diagnóstico Detalhado

Após análise completa, identifiquei a **causa raiz** do problema que persiste mesmo após mudança de browser:

### O Problema Principal: Conflito entre useRef e Hot Module Replacement (HMR)

Quando você faz edições no código:
1. O Vite executa "hot reload" no iframe
2. Os componentes React são remontados
3. **Os `useRef` são re-inicializados com `undefined`**, mas o useEffect que deveria populá-los pode não executar na ordem correta
4. O `useMemo` de `preferredRegions` retorna `undefined` na primeira renderização
5. A queryKey do React Query muda de `['news', 'Todos', 'all', ['Brazil']]` para `['news', 'Todos', 'all', undefined]`
6. React Query cancela a query anterior e inicia uma nova
7. Se o componente remonta novamente (por causa do auth state change), isso cria um loop

### Problemas Específicos Encontrados

1. **`storedRegionsRef` inicializado incorretamente**: O useEffect que popula o ref tem array de dependências vazio, mas o valor inicial é `undefined`. Se o componente renderiza antes do useEffect executar, o `useMemo` retorna `undefined`.

2. **Dois useEffects conflitantes para regions**: Linhas 35-67 e 96-107 ambos lidam com preferredRegions de formas diferentes.

3. **`regionInitializedRef` resetado no hot reload**: O ref é resetado quando o módulo é recarregado, causando re-execução da lógica de inicialização.

4. **Warning de forwardRef ainda presente**: Os logs mostram que ainda há um componente sem forwardRef no render path.

---

## Solução

### Arquivo 1: `src/pages/Index.tsx`

**Mudanças:**
- Consolidar toda lógica de região em um único lugar
- Inicializar `storedRegionsRef` sincronicamente (não em useEffect)
- Usar um valor padrão estável ao invés de `undefined`
- Remover useEffect redundante

```typescript
// ANTES (problemático)
const storedRegionsRef = useRef<string[] | undefined>(undefined);

useEffect(() => {
  if (storedRegionsRef.current === undefined) {
    const stored = localStorage.getItem('realia_preferred_regions');
    // ...
  }
}, []);

// DEPOIS (corrigido)
// Inicialização síncrona - executa apenas uma vez na criação do ref
const storedRegionsRef = useRef<string[] | null>(() => {
  const stored = localStorage.getItem('realia_preferred_regions');
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return null;
    }
  }
  return null;
})();

// Nota: useRef com função é avaliado apenas uma vez
```

**E atualizar o useMemo:**
```typescript
const preferredRegions = useMemo(() => {
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    return profile.preferred_regions;
  }
  // Retornar valor padrão ['Brazil'] se não houver preferências
  return storedRegionsRef.current || ['Brazil'];
}, [profile?.preferred_regions]);
```

### Arquivo 2: `src/hooks/useAuth.ts`

**Mudanças:**
- Adicionar um estado intermediário `profileLoading` para evitar race conditions
- Garantir que `loading` só seja `false` quando AMBOS auth e profile estejam resolvidos

```typescript
const [authLoading, setAuthLoading] = useState(true);
const [profileLoading, setProfileLoading] = useState(false);

// loading agora é combinação dos dois
const loading = authLoading || profileLoading;
```

### Arquivo 3: Remover useEffect redundante

Remover o useEffect das linhas 96-107 em Index.tsx já que a inicialização será síncrona.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Index.tsx` | Inicialização síncrona do storedRegionsRef + remover useEffect redundante + valor padrão no useMemo |
| `src/hooks/useAuth.ts` | Separar loading states para evitar race condition |

---

## Código Final Proposto

### Index.tsx (linhas relevantes)

```typescript
// Inicialização síncrona do localStorage - não usa useEffect
const getStoredRegions = (): string[] | null => {
  try {
    const stored = localStorage.getItem('realia_preferred_regions');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// useRef com valor inicial computado uma única vez
const storedRegionsRef = useRef<string[] | null>(getStoredRegions());

// Remover completamente o useEffect que inicializava storedRegionsRef

// useMemo com valor padrão garantido (nunca undefined)
const preferredRegions = useMemo(() => {
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    return profile.preferred_regions;
  }
  return storedRegionsRef.current || ['Brazil'];
}, [profile?.preferred_regions]);
```

---

## Resultado Esperado

1. Feed nunca fica em loading infinito porque `preferredRegions` sempre tem um valor válido
2. Hot reload não quebra o estado porque a inicialização é síncrona
3. Logout funciona imediatamente
4. Preferências são persistidas corretamente
5. Funciona consistentemente no iframe e em nova aba
