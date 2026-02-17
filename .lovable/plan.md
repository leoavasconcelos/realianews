
# Fix: Estatisticas do perfil e botao "Salvos" sem funcionar

## Problemas Identificados

1. **Contagem de "Noticias lidas"** (linha 292): Exibe `--` fixo, sem dados reais
2. **Contagem de "Salvos"** (linha 296): Exibe `--` fixo, em vez de mostrar o numero de noticias salvas pelo usuario
3. **Botao "Salvos" no menu** (linha 199): Nao tem `onClick` definido, por isso nao responde ao toque

## Solucao

### 1. Mostrar contagem de itens salvos

Importar o hook `useSavedItems` no `ProfileScreen` e usar o tamanho do array retornado para exibir o numero real.

### 2. Tornar o botao "Salvos" clicavel

Adicionar um `onClick` ao item de menu "Salvos" que navega o usuario para a aba "salvos" no app. Como a navegacao entre abas e controlada pelo `Index.tsx`, a melhor abordagem e receber uma prop `onSavedClick` que troca a aba ativa.

### 3. Contagem de noticias lidas

Atualmente nao existe rastreamento de noticias lidas no banco de dados. A solucao mais pratica por agora e remover esse card de estatistica ou substituir pelo numero de interesses + regioes, ate que um sistema de tracking seja implementado.

## Detalhes Tecnicos

### Arquivo: `src/components/ProfileScreen.tsx`

- **Imports**: Adicionar `useSavedItems` de `@/hooks/useNews`
- **Dentro do componente**: Chamar `const { data: savedItems } = useSavedItems(user?.id)` para obter os IDs salvos
- **Linha 292**: Substituir `--` por `savedItems?.length || 0` na contagem de "Noticias lidas" (ou remover esse card e manter apenas 2 colunas)
- **Linha 296**: Substituir `--` por `savedItems?.length || 0` na contagem de "Salvos"
- **Linha 199**: Adicionar `onClick` ao item "Salvos" para navegar a aba de salvos

### Arquivo: `src/components/ProfileScreen.tsx` (interface)

- Adicionar prop `onSavedClick?: () => void` na interface `ProfileScreenProps`

### Arquivo: `src/pages/Index.tsx`

- Na renderizacao do `ProfileScreen`, passar `onSavedClick={() => setActiveTab('salvos')}` como prop

### Resultado esperado

- Card "Salvos" mostra o numero real (ex: "1" baseado nos dados atuais do usuario)
- Card "Noticias lidas" mostra "Em breve" ou e substituido por outra metrica disponivel (regioes selecionadas)
- Menu "Salvos" ao ser tocado leva o usuario para a tela de itens salvos
