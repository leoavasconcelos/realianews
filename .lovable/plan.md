
# Correção do Bug de Travamento na Inicialização do Filtro de Regiões

## Problema Identificado

O `useEffect` que inicializa o filtro de região tem uma condição de corrida:

```typescript
// Problema atual (linhas 35-73)
useEffect(() => {
  if (regionInitialized) return;  // Sai imediatamente se já inicializado
  
  // ... lógica de preferências ...
  
  if (!authLoading) {
    setRegionInitialized(true);  // Marca como inicializado quando auth termina
  }
}, [profile, authLoading, regionInitialized]);  // regionInitialized como dependência causa loops
```

**Cenário de falha:**
1. Componente monta com `authLoading = true`
2. `authLoading` muda para `false` (auth termina sem sessão)
3. `regionInitialized` é setado para `true` antes de `profile` existir
4. Usuário faz login, `profile` carrega
5. Efeito não roda porque `regionInitialized` já é `true`
6. Regiões não são aplicadas corretamente

---

## Solução

Simplificar a lógica removendo `regionInitialized` das dependências e usando uma abordagem mais direta:

### Mudanças no `src/pages/Index.tsx`

**1. Corrigir o useEffect de inicialização (linhas 34-73):**

```typescript
// Inicializar região apenas uma vez quando auth carregar
useEffect(() => {
  // Só inicializa quando auth terminar de carregar
  if (authLoading) return;
  
  // Já inicializado? Não fazer nada
  if (regionInitialized) return;
  
  // Marcar como inicializado PRIMEIRO para evitar re-runs
  setRegionInitialized(true);
  
  // Obter preferências do profile ou localStorage
  let regions: string[] = [];
  
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    regions = profile.preferred_regions;
  } else {
    const stored = localStorage.getItem('realia_preferred_regions');
    if (stored) {
      try {
        regions = JSON.parse(stored);
      } catch {
        regions = [];
      }
    }
  }
  
  // Aplicar filtro baseado nas preferências
  if (regions.length === 1) {
    setActiveRegion(regions[0] as RegionFilterType);
  }
  // Múltiplas regiões: manter 'all' (valor padrão)
  
}, [authLoading, profile, regionInitialized]);
```

**Mudanças-chave:**
- Verifica `authLoading` primeiro e retorna se ainda carregando
- Seta `regionInitialized = true` ANTES de aplicar lógica
- Remove lógica duplicada de hasOnlyBrazil/hasInternational (simplifica)
- Dependências ordenadas corretamente

**2. Simplificar obtenção de preferredRegions (linhas 98-109):**

```typescript
// Usar useMemo para evitar recriação em cada render
const preferredRegions = useMemo(() => {
  if (profile?.preferred_regions && profile.preferred_regions.length > 0) {
    return profile.preferred_regions;
  }
  const stored = localStorage.getItem('realia_preferred_regions');
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}, [profile?.preferred_regions]);
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Index.tsx` | Corrigir useEffect de inicialização e simplificar preferredRegions |

---

## Resultado Esperado

1. App não trava mais durante inicialização
2. Filtro de região é aplicado corretamente após login
3. Preferências são carregadas do profile ou localStorage conforme apropriado
4. Sem loops infinitos de renderização
