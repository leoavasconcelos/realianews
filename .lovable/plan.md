
# Gerenciamento de Usuarios no Painel Admin

## O que sera implementado

Duas novas acoes na tabela de usuarios do painel administrativo:

1. **Editar usuario** - Modal para alterar nome de exibicao, interesses, regioes preferidas e configuracoes de notificacao
2. **Excluir usuario** - Com confirmacao, remove o usuario completamente da plataforma (conta + perfil + dados relacionados)

## Abordagem tecnica

### 1. Banco de dados - Novas politicas RLS

A tabela `profiles` atualmente so permite que admins facam SELECT. Precisamos adicionar:

- **UPDATE por admins**: para que o admin possa editar perfis de outros usuarios
- **DELETE por admins**: para que a exclusao do perfil funcione via cascata

```sql
-- Admin pode atualizar qualquer perfil
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin pode deletar qualquer perfil
CREATE POLICY "Admins can delete all profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
```

### 2. Edge Function - `admin-delete-user`

A exclusao de um usuario da autenticacao (`auth.users`) so pode ser feita com a service role key no lado servidor. Criaremos uma edge function que:

- Valida que o chamador e admin (via JWT)
- Chama `supabase.auth.admin.deleteUser(userId)` que automaticamente exclui o perfil e dados relacionados via `ON DELETE CASCADE`
- Retorna sucesso ou erro

### 3. Frontend - `UsersManagement.tsx`

Adicionar na tabela e no dialog de detalhes:

- **Botao "Editar"**: abre modal com formulario para editar `display_name`, `interests`, `preferred_regions`, notificacoes
- **Botao "Excluir"**: abre AlertDialog de confirmacao. Ao confirmar, chama a edge function
- Apos cada acao, invalida o cache da query `admin-users` para atualizar a lista

### 4. Novo componente - `UserEditModal.tsx`

Modal reutilizavel com campos editaveis do perfil:
- Nome de exibicao (input texto)
- Interesses (checkboxes com os topicos disponiveis)
- Regioes preferidas (checkboxes)
- Notificacoes email/push (switches)

---

## Sequencia de implementacao

1. Migrar banco de dados (novas politicas RLS)
2. Criar edge function `admin-delete-user`
3. Criar componente `UserEditModal.tsx`
4. Atualizar `UsersManagement.tsx` com botoes de editar/excluir e logica de mutacao
