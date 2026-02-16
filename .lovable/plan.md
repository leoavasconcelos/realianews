
# Corrigir Modo Escuro + Desenvolver Menus do Perfil

## Problemas identificados

1. **Modo Escuro**: O toggle do dark mode esta usando `useTheme` dentro de um componente que usa `forwardRef`, o que pode causar problemas de re-render. Alem disso, o `next-themes` precisa de `suppressHydrationWarning` no HTML e o tema pode nao estar sendo lido corretamente. Vamos garantir que o toggle funcione.

2. **Menus sem acao**: Os itens "Configuracoes", "Fontes Bloqueadas" e "Ajuda e Suporte" nao tem `onClick` definido -- por isso nao fazem nada ao clicar.

---

## Plano de implementacao

### 1. Corrigir o toggle do Modo Escuro

**Arquivo**: `src/components/ProfileScreen.tsx`

- Verificar que `useTheme()` esta retornando o tema correto
- Adicionar `resolvedTheme` como fallback (o `theme` pode retornar `"system"` ao inves de `"dark"` ou `"light"`)
- Usar `resolvedTheme` no lugar de `theme` para a logica visual do toggle

### 2. Tela de Fontes Bloqueadas

**Arquivo**: `src/components/ProfileScreen.tsx` (novo Dialog inline)

- Criar um Dialog "Fontes Bloqueadas" similar aos dialogs de Regioes e Interesses
- Buscar a lista de fontes ativas da tabela `sources` no banco
- Mostrar cada fonte com nome e logo, com um botao para bloquear/desbloquear
- As fontes bloqueadas sao salvas no campo `blocked_sources` do perfil (ja existe no banco)
- O usuario pode marcar/desmarcar fontes e salvar

### 3. Tela de Configuracoes

**Arquivo**: `src/components/ProfileScreen.tsx` (novo Dialog inline)

- Criar um Dialog "Configuracoes" com opcoes de conta:
  - **Alterar nome de exibicao** (campo de texto editavel, salva no `display_name` do perfil)
  - **Alterar senha** (usando o `updatePassword` ja disponivel no AuthContext)
- Layout simples com campos de formulario dentro de um Dialog

### 4. Tela de Ajuda e Suporte

**Arquivo**: `src/components/ProfileScreen.tsx` (novo Dialog inline)

- Criar um Dialog "Ajuda e Suporte" com conteudo estatico:
  - FAQ com perguntas frequentes em formato Accordion (usando o componente Accordion ja instalado)
  - Link/botao para contato por email
  - Versao do app

### 5. Conectar os onClick dos menus

**Arquivo**: `src/components/ProfileScreen.tsx`

- Adicionar `onClick` nos itens `blocked`, `settings` e `help` apontando para abrir os respectivos Dialogs
- Adicionar estados `blockedOpen`, `settingsOpen`, `helpOpen`

---

## Detalhes tecnicos

### Correcao do Dark Mode

```tsx
const { theme, setTheme, resolvedTheme } = useTheme();
// Usar resolvedTheme para a logica visual:
const isDark = resolvedTheme === 'dark';
// Toggle:
onClick={() => setTheme(isDark ? 'light' : 'dark')}
```

### Fontes Bloqueadas -- fluxo

1. Buscar fontes: `supabase.from('sources').select('id, name, logo_url').eq('is_active', true)`
2. Mostrar lista com checkbox para cada fonte
3. Fontes ja bloqueadas (do `profile.blocked_sources`) vem pre-marcadas
4. Ao salvar: `updateProfile({ blocked_sources: selectedBlocked })`

### Configuracoes -- campos

- Nome de exibicao: Input com valor atual, botao salvar
- Alterar senha: dois campos (nova senha + confirmar), botao salvar usando `updatePassword`

### Ajuda e Suporte -- conteudo

- Accordion com 4-5 perguntas frequentes sobre o app (ex: "Como salvar noticias?", "Como alterar minhas preferencias?", etc.)
- Botao de contato com `mailto:` link
- Informacao da versao

### Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `src/components/ProfileScreen.tsx` | Corrigir dark mode toggle, adicionar 3 novos Dialogs (Configuracoes, Fontes Bloqueadas, Ajuda), conectar onClick dos menus |

Nenhum novo arquivo sera criado -- tudo sera adicionado no componente ProfileScreen existente, seguindo o mesmo padrao dos Dialogs de Regioes e Interesses que ja funcionam.
