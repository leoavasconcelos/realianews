
# Redesign Premium da Tela de Entrada e Interface do REalia

## Diagnostico

A tela de entrada (Step 0 do OnboardingModal) e a interface geral do app estao com visual generico e simplorio:
- Fundo totalmente branco sem profundidade
- Logo pequena e sem destaque
- Elementos de apresentacao (Feed Personalizado, Resumos Inteligentes) parecem cards basicos
- Sem uso efetivo das cores da marca (Navy, Teal, Burnt Orange)
- Falta textura metalica e sensacao premium definidas no manual

## Mudancas Propostas

### 1. Tela de Boas-Vindas (OnboardingModal - Step 0) - Redesign Completo

**Antes:** Fundo branco liso, logo pequena, cards simples
**Depois:** Tela de impacto com gradiente hero, logo grande e prominente, tipografia elegante

- Fundo com gradiente Navy-to-Teal sutil no topo (hero section), transicionando para branco
- Logo em tamanho XL centralizada com efeito de brilho metalico
- Nome "REalia" em tamanho grande com texto-gradient (navy-teal)
- Subtitulo "Inteligencia Imobiliaria" com tracking largo e estilo editorial
- Cards de feature com bordas sutis, icones coloridos maiores e fundo com leve gradiente
- Adicionar um terceiro card de feature: "Cobertura Global" com icone Globe
- Botao "Comecar" com gradiente hero mais pronunciado e sombra elegante

### 2. Tela de Autenticacao (OnboardingModal - Step 1)

- Adicionar faixa de gradiente hero no topo da tela
- Logo com destaque maior
- Tipografia mais refinada

### 3. Telas de Interesses e Regioes (Steps 2 e 3)

- Manter layout atual funcional
- Melhorar step indicator com cores da marca
- Cards de selecao com hover mais sofisticado (sombra card-hover)

### 4. FeedHeader - Mais Premium

- Adicionar linha fina de gradiente hero abaixo do header (accent line)
- Logo com texto-gradient no nome "REalia"

### 5. BottomNav - Acabamento Refinado

- Indicador ativo com cor accent (burnt-orange) em vez de dot simples
- Barra superior com linha fina de gradiente

### 6. NewsCard - Elevacao Visual

- Sombra mais pronunciada
- Borda sutil na parte superior com cor accent

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/OnboardingModal.tsx` | Redesign completo do Step 0 com gradiente hero, logo grande, cards premium. Steps 1-3 com acabamento visual melhorado |
| `src/components/Logo.tsx` | Adicionar variante com texto-gradient para uso no header |
| `src/components/FeedHeader.tsx` | Adicionar accent line com gradiente, logo com texto-gradient |
| `src/components/BottomNav.tsx` | Indicador ativo mais sofisticado com accent bar |
| `src/components/NewsCard.tsx` | Sombra e bordas mais refinadas |
| `src/index.css` | Adicionar classes utilitarias para novos efeitos visuais (glassmorphism, accent-line) |

## Detalhes Tecnicos

### Paleta em uso (ja definida no CSS):
- **Navy:** `hsl(213 52% 24%)` - cor primaria dominante
- **Teal:** `hsl(173 58% 39%)` - cor de apoio
- **Burnt Orange:** `hsl(21 90% 48%)` - accent para CTAs e destaques
- **Graphite:** `hsl(220 14% 35%)` - textos secundarios
- **Gradiente Hero:** Navy -> Navy-light -> Teal (ja existe como `--gradient-hero`)

### Novos efeitos CSS:
- `.glass-card` - efeito glassmorphism para cards sobre gradiente
- `.accent-line` - linha fina de 2px com gradiente hero
- `.text-gradient-brand` - texto com gradiente para o nome REalia
- Ajuste no `.metallic-texture` para maior subtileza

### Componentes que nao serao alterados:
- `ExploreScreen.tsx` - mantem layout atual
- `ProfileScreen.tsx` - mantem layout atual  
- `AuthModalContent.tsx` - mantem formulario atual (apenas wrapper visual muda)
