

# Plano: Conteudo Completo no App + Audio Funcional

## Problemas Identificados

1. **Resumo curto e texto generico**: O `NewsDetail` exibe o `summary_ai` (3-4 frases) seguido de texto hardcoded generico que nao tem relacao com a noticia real. O usuario precisa sair do app para ler o conteudo completo.
2. **Audio nao funciona**: O player de audio e apenas visual. Os botoes de play/pause e barra de progresso nao reproduzem nenhum audio. Exibe "em breve".

## Solucao

### Parte 1: Analise Completa com IA (sob demanda)

Quando o usuario abrir uma noticia, gerar automaticamente um artigo aprofundado usando IA, eliminando a necessidade de sair do app.

**Nova coluna no banco**: `full_analysis` (TEXT) na tabela `news`.

**Nova Edge Function `generate-full-analysis`**:
- Recebe `newsId`
- Busca titulo, resumo e topicos do banco
- Usa Gemini 3 Flash para gerar artigo de 400-600 palavras em portugues brasileiro
- Estrutura: contexto do mercado, analise dos fatos, impacto e perspectivas
- Salva em `full_analysis` para cache (proxima abertura e instantanea)

**Novo hook `useFullAnalysis`**:
- Busca `full_analysis` do banco
- Se vazio, chama a Edge Function para gerar
- Retorna conteudo + estado de loading

**Mudancas no `NewsDetail`**:
- Remove texto hardcoded generico
- Mostra `summary_ai` como resumo rapido no topo
- Abaixo, exibe a analise completa (`full_analysis`) com skeleton loading enquanto gera
- Link "Ler materia original" permanece como opcao secundaria no final

### Parte 2: Audio Player Funcional com ElevenLabs

Transformar o player decorativo em funcional usando ElevenLabs TTS.

**Requisito**: Sera necessario fornecer a chave de API do ElevenLabs. O servico oferece plano gratuito com creditos iniciais. Voce pode obter a chave em https://elevenlabs.io (Crie conta -> Profile + API Key).

**Nova Edge Function `elevenlabs-tts`**:
- Recebe texto e ID de voz
- Chama API ElevenLabs com modelo `eleven_multilingual_v2`
- Retorna audio MP3 como blob binario

**Novo hook `useAudioPlayer`**:
- Gerencia o objeto `Audio` do navegador
- Controla play/pause, progresso, velocidade
- Sincroniza estado com a UI (barra de progresso, botoes)
- Cache do audio gerado (blob URL) para evitar chamadas repetidas

**Mudancas no `NewsDetail`**:
- Botao Play: primeiro clique mostra loading, chama TTS, depois reproduz
- Barra de progresso sincronizada com reproducao real
- Controle de velocidade funcional (0.75x a 2x)
- Remove texto "em breve", mostra duracao real

### Fluxo do Usuario

```text
Usuario abre noticia
    |
    +--> Ve resumo curto (summary_ai) imediatamente
    |
    +--> Analise completa carrega em ~3s (full_analysis via IA)
    |       Conteudo rico: contexto, analise, impacto, perspectivas
    |
    +--> Pode ouvir o resumo em audio (botao Play)
    |       Audio gerado por ElevenLabs TTS (~2-3s primeiro play)
    |
    +--> Link para materia original (opcao secundaria)
```

## Detalhes Tecnicos

### Migracao de banco:
- `ALTER TABLE news ADD COLUMN full_analysis TEXT;`

### Arquivos a criar:
- `supabase/functions/generate-full-analysis/index.ts`
- `supabase/functions/elevenlabs-tts/index.ts`
- `src/hooks/useFullAnalysis.ts`
- `src/hooks/useAudioPlayer.ts`

### Arquivos a modificar:
- `src/components/NewsDetail.tsx` - integrar conteudo real e player funcional
- `src/hooks/useNews.ts` - incluir `full_analysis` no mapeamento
- `src/components/NewsCard.tsx` - adicionar `fullAnalysis` ao tipo `NewsItem`
- `supabase/config.toml` - registrar novas functions

### Secrets necessarios:
- `ELEVENLABS_API_KEY` - sera solicitada antes da implementacao do audio

### Modelos:
- Gemini 3 Flash Preview (ja disponivel via LOVABLE_API_KEY) para geracao de artigo
- ElevenLabs multilingual v2 para TTS em portugues

