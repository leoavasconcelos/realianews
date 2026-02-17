
# Fix: Edge Function `send-daily-digest` quebrando por uso de API inexistente

## Problema Encontrado

A function `send-daily-digest` esta falhando com o erro:

```
TypeError: supabaseAuth.auth.getClaims is not a function
```

O metodo `getClaims()` nao existe na versao `@supabase/supabase-js@2.49.1` usada na edge function. Isso impede qualquer envio de email.

## Solucao

Substituir `getClaims(token)` por `getUser()`, que e o metodo correto para obter o usuario autenticado a partir do token JWT.

## Dados Atuais

- **6 usuarios** com notificacoes por email ativadas
- **2 admins** cadastrados que podem disparar o envio
- A funcao esta configurada no cron para rodar automaticamente

## Detalhes Tecnicos

### Arquivo: `supabase/functions/send-daily-digest/index.ts`

**Linhas 347-356** - Substituir o bloco de autenticacao:

De:
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const userId = claimsData.claims.sub as string;
```

Para:
```typescript
const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
if (userError || !user) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const userId = user.id;
```

### Apos o deploy

Vou chamar a funcao novamente para validar que os emails estao sendo enviados corretamente para os 6 usuarios cadastrados.
