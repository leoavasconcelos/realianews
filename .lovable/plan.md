
# Fix: Verificar Preferências Salvas no Banco para Evitar Reexibição do Onboarding

## Problema Identificado

Quando um usuário autenticado faz login, o `Index.tsx` mostra o modal de onboarding novamente mesmo que ele já tenha completado o fluxo antes. Isso ocorre porque:

1. A decisão de mostrar o onboarding (linha 21-23 em `Index.tsx`) se baseia **apenas** na flag `realia_onboarding_complete` no localStorage
2. O perfil do usuário (com interesses e regiões salvos) é carregado depois do componente renderizar
3. Não há sincronização entre o estado do perfil carregado e a decisão de mostrar/esconder o onboarding

## Solução

Modificar `Index.tsx` para considerar dois cenários ao decidir se deve mostrar o onboarding:

### 1. Usuário NÃO autenticado
- Mostrar onboarding se `realia_onboarding_complete` não existe no localStorage
- Este é o cenário atual

### 2. Usuário JÁ autenticado (está fazendo login)
- Verificar se `profile.interests.length > 0`
- Se há interesses salvos no banco, **NÃO mostrar** o modal (o usuário já completou o onboarding)
- Se `profile.interests.length === 0`, **mostrar** o modal (primeira vez ou interesses nunca foram preenchidos)

### Lógica de Renderização

```
showOnboarding = (
  // Não completou no localStorage
  !localStorage.getItem('realia_onboarding_complete') 
  // E está desautenticado OU (está autenticado E não tem interesses salvos)
  && (!user || (user && profile?.interests?.length === 0))
)
```

## Mudanças Necessárias

### Arquivo: `src/pages/Index.tsx`

**Linha 21-23 (Estado inicial do showOnboarding):**
- Mudar de: `!localStorage.getItem('realia_onboarding_complete')`
- Para: Considerar também se o usuário tem `profile.interests` salvos

**Após a inicialização de `useAuth` (novo useEffect):**
- Adicionar lógica que atualiza `showOnboarding` quando:
  - O `authLoading` termina (sabemos se há usuário autenticado)
  - E o perfil foi carregado (sabemos se há interesses salvos)
- Se usuário autenticado com interesses salvos → `setShowOnboarding(false)`
- Isso garante que ao fazer login, o modal fechará automaticamente quando o perfil carregar

## Fluxo Corrigido

**Cenário 1: Novo usuário (sem login)**
```
1. App abre → authLoading = true → showOnboarding = false (não renderiza ainda)
2. Auth resolve → user = null → showOnboarding = true (renderiza modal)
3. Usuário faz signup/login → volta para step 1 (auth) do modal
```

**Cenário 2: Usuário retornando (já tem preferências salvas)**
```
1. App abre → authLoading = true → showOnboarding = false (não renderiza ainda)
2. Auth resolve → user existe → profileLoading = true
3. Perfil carrega → profile.interests = ['residencial', 'comercial'] 
4. showOnboarding = false → modal não aparece
5. Usuário vê o feed com suas preferências
```

**Cenário 3: Usuário criou conta mas nunca completou onboarding**
```
1. App abre → auth resolve → user existe
2. Perfil carrega → profile.interests = [] (vazio)
3. showOnboarding = true → modal aparece no step 2 (já autenticado, pula auth)
4. Usuário completa interesses → atualiza no banco
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Index.tsx` | Atualizar lógica de `showOnboarding` para considerar `profile.interests` do banco |

