

## Plano: Auto-publicação no Instagram via Zapier (Carrossel diário)

### Arquitetura

```text
[Cron pg_cron 09:00 BRT]
        ↓
[Edge Function: publish-instagram-digest]
        ↓
1. Seleciona top 5 notícias do dia (trending + image_url + summary_ai)
2. Para cada notícia, gera 3 slides via API de imagem (capa, summary, CTA)
3. Faz upload dos slides para Supabase Storage (bucket público)
4. Monta payload: { caption, slides: [url1, url2, url3, ...], hashtags }
5. POST para o webhook Zapier configurado
        ↓
[Zapier: Webhook → Instagram for Business → Publish Carousel]
```

### Critério de seleção (Top 5 do dia)
Notícias das últimas 24h, ordenadas por:
1. `is_trending = true` primeiro
2. Depois por `published_at DESC`
3. Filtro obrigatório: `image_url IS NOT NULL` + `summary_ai IS NOT NULL`

### Geração de slides (carrossel)
Cada notícia vira **3 slides** (1080×1080 PNG):
- **Slide 1 (Capa)**: imagem original da notícia + overlay escuro + título + logo Realia no canto
- **Slide 2 (Resumo)**: fundo navy da marca + summary_ai dividido em 3-4 bullets + tópicos como tags
- **Slide 3 (CTA)**: "Leia a análise completa no Realia News" + logo + URL `realia.digital`

Geração via **edge function com `@napi-rs/canvas`** ou usando a API de imagem do Lovable AI Gateway (`google/gemini-3-pro-image-preview`) com prompt estruturado. Recomendo Canvas — mais previsível para texto.

### Caption do post
```
[título da notícia]

[summary_ai cortado em 1500 chars]

📍 Fonte: [source.name]
🔗 Leia mais no Realia News (link na bio)

#imoveis #mercadoimobiliario #[topic1] #[topic2] #realianews
```

### Setup Zapier (instruções para o usuário)
1. Criar Zap com trigger **"Webhooks by Zapier" → Catch Hook**
2. Copiar a URL do webhook gerado
3. Ação: **"Instagram for Business" → Publish Carousel Post**
   - Image URLs: mapear array `slides` do payload
   - Caption: campo `caption`
4. Conectar conta IG Business (precisa estar vinculada a uma página do FB)
5. Testar com dados de exemplo

### Mudanças no código

**Backend:**
- `supabase/functions/publish-instagram-digest/index.ts` (novo) — função principal, autenticada via CRON_SECRET ou admin
- `supabase/functions/_shared/generate-slide.ts` (novo) — helper de geração de imagem com Canvas
- Novo bucket Storage `instagram-posts` (público, para hospedar slides gerados)
- Cron pg_cron configurado para 12:00 UTC (09:00 BRT) chamando a função
- Secret novo: `ZAPIER_INSTAGRAM_WEBHOOK_URL`

**Admin UI:**
- Nova página `/admin/instagram` com:
  - Campo para configurar/atualizar o webhook URL
  - Botão **"Publicar agora (preview)"** que gera os slides e mostra antes de enviar
  - Botão **"Disparar digest manualmente"** para testar
  - Histórico das últimas 7 execuções (tabela `instagram_publications`)
- Item no `AdminSidebar` com ícone Instagram

**Banco (migration):**
- Tabela `instagram_publications` (id, news_ids[], slides_urls[], caption, status, error, sent_at) para auditoria
- Tabela `instagram_settings` (singleton: webhook_url, enabled, schedule_hour) para config persistente

### O que você precisa providenciar
1. **Webhook URL do Zapier** (após criar o Zap) — vou pedir via secret
2. **Conta Instagram Business** já vinculada a uma página do Facebook
3. **Plano Zapier** que permita uso recorrente (Free dá só 100 tasks/mês = ~100 slides/mês = limite apertado; Starter $19.99/mês recomendado)

### Arquivos afetados
```text
supabase/functions/publish-instagram-digest/index.ts   (novo)
supabase/functions/_shared/generate-slide.ts           (novo)
supabase/migrations/<nova>.sql                         (tabelas + bucket)
supabase/config.toml                                   (verify_jwt = false)
src/pages/admin/InstagramAutomation.tsx                (nova página)
src/App.tsx                                            (rota)
src/components/admin/AdminSidebar.tsx                  (item de menu)
```

### Resultado esperado
Todo dia às 09:00 BRT, seu Instagram recebe automaticamente um carrossel com as 5 melhores notícias do Realia das últimas 24h, com branding consistente, caption otimizada e link para o app.

