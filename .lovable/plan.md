
# Plano: Compartilhamento via Redes Sociais

## Situacao Atual

O compartilhamento usa apenas `navigator.share()` (API nativa do navegador). Funciona bem em celulares, mas em desktops frequentemente nao esta disponivel, e o fallback e apenas copiar o link. Nao ha opcoes diretas de redes sociais.

## Solucao

Criar um **sheet/modal de compartilhamento** com botoes diretos para as principais redes sociais, alem de manter a opcao de copiar link. O modal aparecera ao clicar no icone de compartilhamento tanto no `NewsCard` quanto no `NewsDetail`.

### Redes sociais incluidas:
- **WhatsApp** - principal canal de comunicacao no Brasil
- **X (Twitter)**
- **LinkedIn** - relevante por ser conteudo de mercado imobiliario
- **Telegram**
- **Facebook**
- **Copiar link** - fallback universal

### Experiencia do usuario:
1. Usuario clica no icone de compartilhamento
2. Abre um sheet (drawer) na parte inferior da tela com os botoes das redes
3. Cada botao abre a rede social em nova aba com o titulo + resumo + link pre-preenchidos
4. Botao "Copiar link" copia a URL e mostra toast de confirmacao

## Detalhes Tecnicos

### Arquivo a criar:
- `src/components/ShareSheet.tsx` - Componente de sheet com os botoes de redes sociais. Usa o componente `Drawer` (vaul) existente. Cada rede social abre via `window.open()` com URL parametrizada (ex: `https://api.whatsapp.com/send?text=...`, `https://twitter.com/intent/tweet?text=...`).

### Arquivos a modificar:
- `src/pages/Index.tsx` - Alterar `handleShareNews` para abrir o `ShareSheet` em vez de chamar `navigator.share` diretamente. Adicionar estado para controlar o sheet e a noticia selecionada para compartilhamento.
- `src/components/NewsDetail.tsx` - Alterar o botao de share para abrir o `ShareSheet` diretamente dentro do detalhe, em vez de delegar para `onShare`.
- `src/components/SavedItemsScreen.tsx` - Mesma alteracao: usar `ShareSheet` no `handleShare`.

### Nenhuma mudanca de banco de dados necessaria.

### URLs de compartilhamento por rede:
- WhatsApp: `https://api.whatsapp.com/send?text={titulo} - {url}`
- X/Twitter: `https://twitter.com/intent/tweet?text={titulo}&url={url}`
- LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={url}`
- Telegram: `https://t.me/share/url?url={url}&text={titulo}`
- Facebook: `https://www.facebook.com/sharer/sharer.php?u={url}`
