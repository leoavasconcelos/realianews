
## Objetivo
Trocar o modelo atual de “digest diário em carrossel às 09:00” por um fluxo editorial de Instagram com aparência de portal de notícias:
- posts frequentes ao longo do dia
- fila com aprovação manual
- imagem única como padrão
- carrossel apenas quando a notícia tiver múltiplas imagens realmente úteis
- sem “Leitura do REalia” nos posts neste primeiro momento

## O que será mudado

### 1. Reposicionar a feature
A feature deixará de ser um “digest” e passará a ser uma “fila editorial de posts”.
Isso exige mudar:
- nomenclatura da UI
- modelo de dados
- lógica da edge function
- regra de seleção das notícias
- formato do payload enviado ao Zapier

### 2. Novo formato editorial inspirado no benchmark enviado
Com base nos exemplos e no padrão descrito:
- arte principal com foto da notícia
- título da notícia sobre a imagem
- editoria/tag curta no topo (ex.: Mercado, Crédito, Incorporação, Varejo, Fundos)
- legenda com resumo curto em tom jornalístico
- sem interpretação editorial fixa no post
- carrossel só quando houver mais de uma imagem relevante da mesma notícia

### 3. Mudança de automação
Em vez de 1 publicação diária:
- criar uma fila contínua de posts elegíveis
- cada item entra como rascunho/aprovação pendente
- admin revisa e dispara manualmente
- preparar o sistema para futura automação em tempo real com intervalo mínimo entre posts, sem já publicar sozinho

## Implementação planejada

### Etapa 1 — Ajustar banco e auditoria
Criar uma migration para substituir o modelo atual por um fluxo de fila editorial.

#### `instagram_settings`
Expandir a tabela singleton para suportar:
- `mode` / tipo de operação (`approval_queue`)
- `auto_enqueue_enabled`
- `min_interval_minutes`
- `single_post_default`
- `carousel_when_multiple_images`
- `max_caption_length`
- `brand_style` / variante visual

Manter:
- `webhook_url`
- `enabled`

Descontinuar ou deixar sem uso:
- `schedule_hour`
- `top_n`

#### `instagram_publications`
Expandir para representar um post individual, não um digest:
- `news_ids` continua, mas normalmente com 1 item
- `status` passa a suportar algo como:
  - `queued`
  - `preview`
  - `approved`
  - `sent`
  - `failed`
  - `cancelled`
- `post_type`: `single_image` | `carousel`
- `primary_news_id`
- `title_snapshot`
- `section_label`
- `image_count`
- `selected_image_urls`
- `caption`
- `published_at`
- `approved_by`
- `approved_at`
- `source_snapshot`
- `metadata` com rastreabilidade editorial

#### Segurança
Manter RLS restrito a admin/moderator, seguindo os padrões atuais de `is_admin_or_moderator(auth.uid())`.

### Etapa 2 — Refatorar a edge function
Refatorar `supabase/functions/publish-instagram-digest/index.ts` para virar um pipeline de post individual.

#### Modos novos
Substituir os modos atuais por algo como:
- `generate_queue` — varre notícias elegíveis e cria itens pendentes
- `preview_post` — gera arte e legenda de um item da fila
- `send_post` — envia o item aprovado ao webhook
- `regenerate_post` — refaz arte/legenda
- `webhook_test`

#### Seleção de notícias
Trocar a lógica de “top N das últimas 24h” por:
- notícias recentes e ainda não enfileiradas/publicadas
- com `summary_ai`
- com `image_url`
- opcionalmente `is_trending` como prioridade
- deduplicação por `source_url` / notícia já usada
- priorização das mais novas para evitar conteúdo “velho”

#### Geração de legenda
A legenda passará a:
- usar 1 notícia principal
- abrir com um resumo jornalístico curto
- manter tom premium e autoritativo
- evitar CTA exagerado
- remover, por enquanto, a seção “Leitura do REalia”
- incluir hashtags mais discretas e menos genéricas

#### Geração de arte
Trocar o visual atual de slides editoriais por:
- template de imagem única
- foto ocupando a arte
- overlay escuro sofisticado
- título em destaque sobre a imagem
- editoria curta na parte superior
- assinatura visual discreta da marca

#### Carrossel opcional
Se houver múltiplas imagens válidas para a mesma notícia:
- gerar carrossel enxuto com 2–4 imagens
- manter a 1ª slide com título
- slides seguintes priorizam imagem, não blocos de texto
- evitar carrossel “explicativo” genérico

### Etapa 3 — Reestruturar a tela `/admin/instagram`
A página atual está orientada a digest diário. Ela será redesenhada para operação editorial.

#### Bloco principal
Trocar:
- “Automação diária”
- “Top notícias do dia”
- badge “09:00 BRT”
- “Disparar digest manualmente”

Por:
- “Fila editorial do Instagram”
- status da fila
- intervalo mínimo entre posts
- modo padrão: imagem única
- carrossel opcional quando aplicável

#### Novas áreas da tela
1. **Configuração editorial**
   - habilitar fila
   - intervalo mínimo entre posts
   - regra de carrossel
   - webhook
   - estilo visual

2. **Fila de posts**
   - cards/tabela com notícias pendentes
   - status
   - tipo do post
   - horário da notícia
   - fonte
   - ações: preview, regenerar, aprovar/enviar, cancelar

3. **Preview do post**
   - imagem principal em tamanho maior
   - se carrossel, miniaturas adicionais
   - legenda pronta para envio

4. **Histórico**
   - últimas execuções/publicações
   - aprovado por quem
   - erro de envio
   - tipo de post

### Etapa 4 — Atualizar o payload do Zapier
Trocar o payload atual de digest/carrossel por algo orientado a post unitário:
```text
{
  postType: "single_image" | "carousel",
  caption: "...",
  images: ["url1", "url2"],
  title: "...",
  section: "...",
  newsId: "...",
  publicationId: "..."
}
```
Assim o Zap pode:
- publicar imagem única na maioria dos casos
- publicar carrossel somente quando houver múltiplas imagens

### Etapa 5 — Ajustar copy e branding
O novo visual seguirá:
- foto real da notícia como protagonista
- tipografia sans premium
- contraste alto
- branding REalia discreto
- menos “deck/corporate presentation”
- mais “publicação editorial nativa de Instagram”

Com base nos exemplos enviados, a copy da legenda ficará:
- mais curta
- mais factual
- com mais ritmo de portal
- menos institucional
- sem bloco interpretativo fixo por enquanto

## Arquivos que devem ser alterados

### Backend
- `supabase/functions/publish-instagram-digest/index.ts` — refatoração forte do fluxo
- possivelmente criar helpers compartilhados para:
  - seleção de notícias
  - montagem de legenda
  - render da arte principal

### Frontend
- `src/pages/admin/InstagramAutomation.tsx` — redesign completo da página
- possivelmente ajustes em:
  - `src/components/admin/AdminSidebar.tsx` (rótulo opcional)
  - `src/App.tsx` apenas se houver split em novas páginas/componentes

### Banco
- nova migration em `supabase/migrations/...`
  - novos campos
  - novos status
  - índices
  - compatibilidade com dados atuais

## Compatibilidade e cuidado técnico
- Preservar registros atuais de `instagram_publications` sempre que possível
- Não depender de cron fixo para operação editorial
- Manter autenticação da edge function como hoje: cron secret + JWT validado em código + checagem de role
- Evitar render pesado para não repetir o erro de resource limit
- Priorizar arte simples e robusta com 1 imagem principal

## Resultado esperado
Após a implementação:
- o Instagram passa a operar como canal de notícias frequentes
- os posts entram em fila para aprovação
- o formato padrão vira imagem única com headline sobre foto
- carrossel só aparece quando fizer sentido editorial
- o admin consegue revisar, pré-visualizar e publicar rapidamente
- o visual fica mais próximo do benchmark e menos parecido com um digest em slides
