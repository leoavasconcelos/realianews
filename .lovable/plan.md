

## Diagnóstico dos problemas

Encontrei **4 bugs distintos** no pipeline de tópicos/filtros. Todos têm causa comum: o sistema de tópicos é fragmentado e mal alinhado entre as 3 fontes da verdade (tabela `topics`, detector na agregação, e onboarding).

### Problema 1: "Fundos Imobiliários" (filtro) ≠ "FIIs" (tag salva)
- Tabela `topics` tem o nome **"Fundos Imobiliários"**.
- O `aggregate-news/detectTopics` salva a tag como **"FIIs"** (string literal).
- `useNews` filtra com `topics.includes(filter.toLowerCase())` → `"fiis".includes("fundos imobiliários")` = **false**.
- Resultado: **2.502 notícias com FIIs, 0 aparecem ao clicar em "Fundos Imobiliários"**.

Mesmo problema afeta: **"Mercado Imobiliário"**, **"Lançamentos"**, **"Governo"** (existem como tags mas não como topics na tabela), e os topics `Investimentos`, `Logística`, `Sustentabilidade`, `Crédito`, `Luxo`, `PropTech`, `Coliving`, `Data Centers`, `Leilões`, `Multipropriedade`, `Retrofit`, `Startups`, `Regulamentação`, `Corporativo` (existem como filtro mas o detector nunca os atribui).

### Problema 2: Notícias internacionais marcadas erradamente como "FIIs"
Olhando os dados: títulos como _"Realtor.com lança plataforma para MLSs"_, _"Telhados de barro na Indonésia"_, _"Por que o ponto cego em P&D na construção civil"_ estão com tag **FIIs**.

Causa: O `detectTopics` roda sobre o título **traduzido em PT-BR** (após backfill). A keyword `"cri"` (de CRI – Certificado Recebíveis Imobiliários) faz match em qualquer palavra que contenha "cri" — _"escritório"_, _"crise"_, _"crítico"_, _"descrição"_, _"Crit"_, etc. A keyword `"fii"` também faz match em palavras como _"edifício"_ se houver caracteres parecidos. O resultado é que praticamente toda notícia internacional ganha tag FIIs incorretamente.

### Problema 3: Notícias internacionais sem tópico nenhum
- **2.735 de 2.844** notícias dos EUA, **653 de 688** da Europa e **2.091 de 2.491** do "World" estão **sem nenhum tópico**.
- Causa: o `detectTopics` usa só keywords em **português** ("aluguel", "imóveis", "construção"). Notícias internacionais entram traduzidas (após backfill) ou em inglês (na agregação), e o matching falha. Além disso, `aggregate-news` chama `detectTopics` no momento da inserção, **antes** da tradução do título — portanto sempre roda em inglês para notícias internacionais.

### Problema 4: Como funciona a "análise" mostrada ao usuário
Em `NewsDetail` há duas seções de IA:
1. **Resumo** (`summary_ai`): gerado em `aggregate-news` ou `process-news-summaries` chamando Lovable AI (Gemini) com o conteúdo bruto + lista de tópicos.
2. **Análise completa** (`full_analysis`): gerada **on-demand** pelo `generate-full-analysis` quando o usuário abre a notícia. O prompt **inclui a lista de tópicos como contexto**: `Tópicos: ${topics.join(", ")}`.

→ Como as notícias internacionais ganham tag "FIIs" errada (Problema 2), a IA gera análise enviesada para investidores de fundos imobiliários, mesmo quando a notícia é sobre telhado na Indonésia.

---

## Plano de correção

### 1. Unificar a fonte da verdade dos tópicos (`supabase/functions/aggregate-news/index.ts`)
Reescrever `detectTopics` para:
- Usar **exatamente os nomes da tabela `topics`** (Fundos Imobiliários, Investimentos, Logística, etc.) em vez de "FIIs", "Mercado Imobiliário", etc.
- Ter keywords em **PT e EN** para cada tópico (notícias internacionais entram em inglês).
- Usar **word boundaries** (`\b`) em vez de `includes()` para evitar falsos positivos como "cri" → "escritório", "fii" → "edifício".
- Expandir cobertura para os tópicos hoje órfãos: PropTech, Logística, Sustentabilidade, Luxo, Crédito, Data Centers, Coliving, Leilões, Retrofit, Startups, Regulamentação, Corporativo.

### 2. Re-detectar tópicos APÓS tradução em `process-news-summaries`
No modo `titles_only`, depois de salvar o título PT-BR, rodar o novo `detectTopics(titulo_pt, summary_ai_pt)` e atualizar `topics` da notícia. Isso resolve as ~5.479 notícias internacionais hoje sem tag (ou com tag FIIs errada).

### 3. Backfill em massa via SQL migration
Migration que limpa as tags FIIs falsas das notícias internacionais (regra: `region != 'Brazil' AND topics @> '["FIIs"]'` E o título não contém `\b(REIT|fund|fii|fiagro|cri)\b` com word boundary) e zera tópicos órfãos para reprocessamento.

### 4. Tornar o filtro tolerante (`src/hooks/useNews.ts`)
Adicionar mapeamento de aliases: `"Fundos Imobiliários" → ["Fundos Imobiliários", "FIIs", "REIT"]` para que mesmo notícias antigas com tag "FIIs" continuem aparecendo no filtro "Fundos Imobiliários" durante a transição.

### 5. Melhorar a análise (`supabase/functions/generate-full-analysis/index.ts`)
Adicionar instrução no prompt para **ignorar tópicos quando não houver coerência clara** com o conteúdo da notícia, e para **adaptar o ângulo da análise ao tipo de notícia** (mercado internacional vs. brasileiro, residencial vs. comercial, etc.) em vez de sempre falar de "investidores".

### 6. Limpar cache de full_analysis enviesados
Opcional: `UPDATE news SET full_analysis = NULL WHERE region != 'Brazil' AND full_analysis ILIKE '%fundos imobiliários%'` para forçar regeneração com o prompt corrigido.

---

## Arquivos a editar

```text
supabase/functions/aggregate-news/index.ts        (reescrever detectTopics)
supabase/functions/process-news-summaries/index.ts (re-detectar após tradução)
supabase/functions/generate-full-analysis/index.ts (prompt mais neutro)
src/hooks/useNews.ts                              (aliases de tópicos)
supabase/migrations/<nova>.sql                    (limpar tags falsas)
```

## Resultado esperado
- Filtro "Fundos Imobiliários" passa a mostrar todas as 2.502+ notícias.
- Notícias internacionais (EUA/Europa/World) ganham tópicos corretos em vez de ficar sem nada ou marcadas como FIIs.
- Filtros como Logística, Sustentabilidade, PropTech, Luxo passam a ter conteúdo.
- Análises de notícias internacionais deixam de ter viés forçado em "FIIs/investidores".

