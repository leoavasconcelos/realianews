
# Fix definitivo: Botao "Continuar" invisivel no onboarding

## Causa raiz real

O layout tem 3 niveis de flex column aninhados:

```text
[1] fixed inset-0 flex-col overflow-hidden   (linha 168 - altura fixa, OK)
  [2] flex-1 flex-col                         (linha 254 - SEM min-h-0, PROBLEMA)
    [3] flex-1 min-h-0 overflow-y-auto        (linha 272 - tem min-h-0, OK)
```

O fix anterior adicionou `min-h-0` apenas no nivel 3, mas o nivel 2 (o wrapper do step > 0) tambem precisa de `min-h-0`. Sem isso, o nivel 2 cresce alem do viewport, e o `overflow-y-auto` do nivel 3 nunca e ativado porque seu container pai ja ultrapassou os limites.

## Correcao

### Arquivo: `src/components/OnboardingModal.tsx`

**Linha 254** - Adicionar `min-h-0` ao wrapper dos steps 1-3:

```
// De:
<div className="flex-1 flex flex-col bg-background">

// Para:
<div className="flex-1 min-h-0 flex flex-col bg-background">
```

Isso completa a cadeia de restricao de altura em todos os niveis do flexbox, garantindo que o scroll funcione e o botao "Continuar" permaneca fixo na parte inferior da tela.
