
# Fix: Botao "Continuar" invisivel na tela de interesses do onboarding

## Problema

No passo 2 do onboarding (selecao de interesses), o grid de 7 cards em 2 colunas ocupa mais espaco que a tela do celular. O container deveria rolar (scroll), mas em vez disso ele expande e empurra o botao "Continuar" para fora da tela.

## Causa raiz

Bug classico de flexbox: um elemento filho com `flex-1` e `overflow-y-auto` precisa tambem de `min-h-0` para que o navegador respeite o overflow e ative o scroll. Sem `min-h-0`, o conteudo interno forca o container a crescer alem do viewport.

## Correcao

### Arquivo: `src/components/OnboardingModal.tsx`

**Linha 272** - Adicionar `min-h-0` ao div de conteudo:

```
// De:
<div className={`flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto ${...}`}>

// Para:
<div className={`flex-1 min-h-0 flex flex-col items-center px-6 py-8 overflow-y-auto ${...}`}>
```

Essa unica alteracao faz com que o container de conteudo respeite os limites do viewport e ative o scroll quando o conteudo excede o espaco disponivel. O botao "Continuar" no rodape ficara sempre visivel e fixo na parte inferior da tela.
