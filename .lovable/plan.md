

# Refresh do Feed + Foto de Perfil

## Resumo

Duas melhorias independentes:
1. **Auto-refresh do feed**: sempre que o usuario navegar para a aba "Mercado", as noticias serao recarregadas automaticamente.
2. **Foto de perfil**: permitir upload de uma foto de perfil que sera armazenada no storage e exibida no avatar do usuario.

---

## 1. Auto-refresh do feed ao acessar a aba

### O que muda

No `Index.tsx`, quando `activeTab` mudar para `'mercado'`, invalidar a query `['news', ...]` do React Query para forcar um refetch.

### Detalhe tecnico

- Importar `useQueryClient` do React Query no `Index.tsx`
- Adicionar um `useEffect` que observa `activeTab` e, quando for `'mercado'`, chama `queryClient.invalidateQueries({ queryKey: ['news'] })`
- Tambem reduzir o `staleTime` em `useNews.ts` de 30s para 0 para que a invalidacao sempre dispare um fetch real

---

## 2. Upload de foto de perfil

### O que muda

- Criar um bucket de storage chamado `avatars` (publico) com politicas RLS para que cada usuario possa enviar/atualizar/deletar apenas seus proprios arquivos
- Na tela de Perfil, o avatar circular (que hoje mostra um icone generico) se torna clicavel e abre um seletor de arquivo
- A imagem e enviada para o bucket, a URL publica e salva no campo `avatar_url` da tabela `profiles`
- O avatar e exibido usando o componente `Avatar` do shadcn/ui

### Etapas tecnicas

1. **Migracao SQL**: criar bucket `avatars` publico + politicas RLS (INSERT, UPDATE, DELETE, SELECT para owner; SELECT publico para leitura)
2. **`ProfileScreen.tsx`**:
   - Adicionar `<input type="file" accept="image/*">` oculto com ref
   - Ao clicar no avatar, abrir o seletor de arquivo
   - No `onChange`, fazer upload via `supabase.storage.from('avatars').upload(...)` com path `{userId}/avatar.{ext}`
   - Obter URL publica via `getPublicUrl` e chamar `updateProfile({ avatar_url: url })`
   - Substituir o div com icone `<User>` pelo componente `<Avatar>` + `<AvatarImage>` + `<AvatarFallback>`
3. **Exibir avatar em outros locais** (opcional): o `profile.avatar_url` ja esta disponivel no contexto global, podendo ser usado futuramente em outros componentes

### Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `src/pages/Index.tsx` | Adicionar `useEffect` para invalidar queries ao entrar no feed |
| `src/hooks/useNews.ts` | Reduzir `staleTime` para 0 |
| `src/components/ProfileScreen.tsx` | Adicionar upload de avatar, trocar icone por componente Avatar |
| Migracao SQL | Criar bucket `avatars` com RLS |

