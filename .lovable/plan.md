
## Diagnostico

As noticias pararam de atualizar porque o **cron job** chama a funcao `aggregate-news` usando o **anon key** (sem sessao de usuario), mas a funcao exige autenticacao de admin (verifica `user_roles`). O cron nao tem contexto de usuario, entao a chamada falha com erro 401/403 silenciosamente. A ultima noticia no banco e de 11 de fevereiro -- 6 dias atras.

## Plano de Correcao

### 1. Corrigir a funcao `aggregate-news` para aceitar chamadas do cron

Adicionar um caminho alternativo de autorizacao: quando a chamada vier com o **service role key** (em vez do anon key), pular a verificacao de admin e executar diretamente. Chamadas de usuarios normais continuam exigindo role de admin.

Logica:
- Extrair o token do header Authorization
- Se o token for igual ao `SUPABASE_SERVICE_ROLE_KEY`, prosseguir sem checar roles
- Caso contrario, manter a verificacao de admin existente

### 2. Atualizar o cron job para rodar a cada hora e usar service role key

Remover o cron atual e criar um novo com:
- Schedule: `0 * * * *` (a cada hora)
- Header Authorization usando o service role key em vez do anon key

```text
SQL a executar (via migration):

-- Remover cron antigo
SELECT cron.unschedule('aggregate-news-every-6-hours');

-- Criar novo cron horario usando service role key
SELECT cron.schedule(
  'aggregate-news-hourly',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := '...functions/v1/aggregate-news',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) $$
);
```

### 3. Pull-to-refresh no feed Mercado

Implementar gesto de "puxar para baixo" no feed de noticias:

- Criar um componente `PullToRefresh` reutilizavel que:
  - Detecta gesto de toque/arraste para baixo quando o scroll esta no topo
  - Mostra indicador de carregamento (spinner + texto "Atualizando...")
  - Chama `queryClient.invalidateQueries({ queryKey: ['news'] })` para recarregar
  - Anima o retorno apos conclusao

- Integrar no `Index.tsx` envolvendo o conteudo do feed Mercado com o `PullToRefresh`

---

### Secao Tecnica

**Arquivos a criar:**
- `src/components/PullToRefresh.tsx` -- componente de pull-to-refresh com touch events

**Arquivos a modificar:**
- `supabase/functions/aggregate-news/index.ts` -- adicionar bypass de auth para service role key
- `src/pages/Index.tsx` -- envolver feed com PullToRefresh

**SQL a executar:**
- Remover cron antigo (`aggregate-news-every-6-hours`)
- Criar novo cron horario (`aggregate-news-hourly`) com service role key

**Mudancas na funcao edge `aggregate-news`:**
- Linhas 489-553: refatorar bloco de autenticacao para verificar se o token e o service role key antes de tentar validar como JWT de usuario
- Remover rate limit para chamadas do cron (apenas aplicar para chamadas de usuario)
