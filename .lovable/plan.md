
# Fix: Botao "Continuar" invisivel na tela de interesses do onboarding

## Problema

Na tela de selecao de interesses (passo 2 do onboarding), o botao "Continuar" nao aparece em telas de celular menores. Isso acontece porque:

1. A area de conteudo usa `justify-center` em um flex column, o que centraliza verticalmente o grid de 7 interesses
2. Em telas pequenas, o grid de interesses (7 cards em 2 colunas = 4 linhas) ocupa mais espaco do que o disponivel
3. O `justify-center` combinado com overflow faz o conteudo "empurrar" para fora do viewport, tornando o botao do footer invisivel ou inacessivel

## Solucao

Modificar o layout do `OnboardingModal.tsx` para garantir que o botao fique sempre visivel:

1. **Remover `justify-center` da area de conteudo nos passos 2 e 3** - usar `justify-start` para que o conteudo comece do topo e o scroll funcione corretamente
2. **Manter `justify-center` apenas no passo 1** (autenticacao) onde o conteudo e mais curto
3. **Adicionar `safe-area-inset-bottom` no footer** para evitar que o botao fique escondido atras do indicador home do iPhone

## Detalhes Tecnicos

### Arquivo modificado: `src/components/OnboardingModal.tsx`

**Linha 272** - Alterar a classe da div de conteudo:
- De: `className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto"`
- Para: usar `justify-center` apenas no passo 1 (auth), e `justify-start pt-4` nos passos 2 e 3

**Linha 418** - Adicionar padding seguro no footer:
- Adicionar `pb-safe` ou padding extra para garantir visibilidade em dispositivos com notch/home indicator
