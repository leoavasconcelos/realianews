
# Plano: Melhorar Template do E-mail de Resumo Diário

## Visão Geral
Atualizar o template HTML do e-mail `send-daily-digest` para incluir imagens das notícias, cores mais vibrantes e uma formatação visual mais atraente e profissional.

---

## Melhorias Planejadas

### 1. Cards de Notícia com Imagem
Cada notícia terá:
- Imagem destacada (thumbnail) à esquerda ou no topo
- Layout em card com bordas arredondadas e sombra sutil
- Melhor hierarquia visual do conteúdo

### 2. Cores Mais Vibrantes
- Header com gradiente mais chamativo (tons de azul/roxo)
- Badges de tópicos coloridos por categoria
- Botões de ação com cores vibrantes
- Indicador visual de notícias em alta (trending)

### 3. Formatação Visual Aprimorada
- Espaçamento mais generoso entre elementos
- Tipografia com melhor contraste
- Separadores visuais entre seções
- Ícones para enriquecer a comunicação
- Badge de região para notícias internacionais

### 4. Seções Adicionais
- Data do resumo no header
- Contador de notícias
- Seção de "notícia destaque" para a principal

---

## Estrutura do Novo Layout

```text
┌─────────────────────────────────────────────┐
│          HEADER (Gradiente Azul/Roxo)       │
│   ┌─────┐                                   │
│   │Logo │  REalia                           │
│   └─────┘  Resumo Diário • 27 Jan 2026      │
└─────────────────────────────────────────────┘
│                                             │
│  Bom dia, Leonardo! 👋                      │
│  5 notícias selecionadas para você          │
│                                             │
├─────────────────────────────────────────────┤
│  ★ DESTAQUE                                 │
│  ┌─────────────────────────────────────┐    │
│  │        [IMAGEM DA NOTÍCIA]          │    │
│  │                                     │    │
│  │  🏷️ Mercado                         │    │
│  │  Título da Notícia Principal        │    │
│  │  Resumo com mais caracteres...      │    │
│  │         [Ler Notícia →]             │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  MAIS NOTÍCIAS                              │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 📷 │ 🏷️ Tópico                        │  │
│  │    │ Título da notícia 2              │  │
│  │    │ Resumo curto...       [Ler →]    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 📷 │ 🏷️ Tópico                        │  │
│  │    │ Título da notícia 3              │  │
│  │    │ Resumo curto...       [Ler →]    │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│              [Ver Todas as Notícias]        │
├─────────────────────────────────────────────┤
│             FOOTER                          │
│  Gerenciar preferências | Cancelar inscrição│
└─────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo a Modificar
- `supabase/functions/send-daily-digest/index.ts`

### Mudanças na Função `generateEmailHtml`

1. **Adicionar função helper para cores de tópicos:**
```typescript
const getTopicColor = (topic: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    "Mercado": { bg: "#dbeafe", text: "#1e40af" },
    "Economia": { bg: "#fef3c7", text: "#b45309" },
    "Investimentos": { bg: "#d1fae5", text: "#065f46" },
    // ... mais tópicos
  };
  return colors[topic] || { bg: "#f3f4f6", text: "#374151" };
};
```

2. **Adicionar função para badge de região:**
```typescript
const getRegionBadge = (region: string | null) => {
  switch(region) {
    case "USA": return "🇺🇸";
    case "Europe": return "🇪🇺";
    // ... mais regiões
  }
};
```

3. **Separar notícia destaque das demais:**
- Primeira notícia com imagem grande no topo
- Demais notícias com layout horizontal (imagem pequena à esquerda)

4. **Fallback para imagens:**
- URL de imagem placeholder quando `image_url` é null

---

## Detalhes Visuais

### Paleta de Cores
| Elemento | Cor Atual | Nova Cor |
|----------|-----------|----------|
| Header BG | `#1e40af → #3b82f6` | `#4f46e5 → #7c3aed` (Indigo/Purple) |
| Badge Tópico | Cinza único | Cores por categoria |
| Botão CTA | Azul gradiente | Roxo vibrante com hover |
| Trending Badge | Não existe | `#f97316` (Laranja) |

### Tipografia
- Títulos: 18px → 20px, font-weight: 700
- Resumos: 14px → 15px, line-height: 1.7
- Badges: 11px → 12px, uppercase

### Espaçamento
- Padding entre cards: 20px → 24px
- Margin interno dos cards: 16px → 20px
- Border radius: 12px → 16px

---

## Exemplo de Card com Imagem

```html
<tr>
  <td style="padding: 0 0 20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" 
           style="background: #ffffff; border-radius: 16px; 
                  overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <tr>
        <td style="width: 120px; vertical-align: top;">
          <img src="[IMAGE_URL]" alt="" 
               style="width: 120px; height: 100px; object-fit: cover;"/>
        </td>
        <td style="padding: 16px; vertical-align: top;">
          <span style="background: #dbeafe; color: #1e40af; 
                       font-size: 11px; padding: 4px 8px; 
                       border-radius: 6px; font-weight: 600;">
            MERCADO
          </span>
          <h3 style="margin: 8px 0; font-size: 16px; 
                     font-weight: 600; color: #111827;">
            Título da Notícia
          </h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Resumo da notícia...
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

---

## Compatibilidade

O template será otimizado para:
- Gmail (Web e Mobile)
- Apple Mail
- Outlook (2016+)
- Mobile (responsivo com max-width)

Usaremos tabelas para layout (padrão em emails) e estilos inline para máxima compatibilidade.

---

## Resultado Esperado

Um e-mail visualmente atraente que:
- Destaca a notícia principal com imagem grande
- Apresenta notícias secundárias em formato compacto com thumbnails
- Usa cores vibrantes que identificam categorias
- Mantém boa legibilidade em dispositivos móveis
- Incentiva cliques com CTAs bem posicionados
