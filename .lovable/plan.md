

# Atualizar Logomarca e Corrigir Tamanhos

## Resumo

Substituir a imagem da logo pela nova versao enviada e aumentar os tamanhos do icone em todos os contextos para melhor visibilidade.

## Etapas

1. **Copiar a nova imagem** para `src/assets/realia-logo.png` e `public/realia-logo.png` (substituindo as anteriores)
2. **Aumentar os tamanhos no `Logo.tsx`** para que a logo fique mais visivel em todas as telas

## Detalhes Tecnicos

### 1. Copiar o novo asset

```
user-uploads://1AB47A3F-6EB2-4945-86EB-27380DF37F92.png -> src/assets/realia-logo.png
user-uploads://1AB47A3F-6EB2-4945-86EB-27380DF37F92.png -> public/realia-logo.png
```

### 2. Ajustar tamanhos em `src/components/Logo.tsx`

Aumentar as classes de tamanho para melhor proporcao visual:

```
Antes:            Depois:
sm: w-8 h-8   ->  sm: w-10 h-10
md: w-10 h-10 ->  md: w-12 h-12
lg: w-14 h-14 ->  lg: w-16 h-16
xl: w-20 h-20 ->  xl: w-24 h-24
```

Nenhum outro arquivo precisa ser alterado -- todos os 7 locais que usam o componente Logo herdaam automaticamente os novos tamanhos e a nova imagem.

