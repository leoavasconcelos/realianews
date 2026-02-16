
# Restaurar aba Comunidade + Explicacao sobre o Refresh do Feed

## Resumo

Adicionar de volta a aba "Comunidade" no menu inferior, mantendo a aba "Salvos" que ja existe. O menu passara de 5 para 6 abas.

---

## Sobre o refresh do feed (como funciona hoje)

O refresh das noticias **ja esta implementado** e funciona da seguinte forma:

- **Quando**: toda vez que voce troca para a aba "Mercado", o app automaticamente busca as noticias mais recentes no banco de dados.
- **Nao ha um intervalo de tempo automatico** (ex: a cada 5 minutos). O refresh so acontece quando voce navega para a aba Mercado.
- Se voce ficar parado na aba Mercado sem sair, as noticias nao se atualizam sozinhas.

**Importante**: as noticias que aparecem no feed dependem de estarem cadastradas no banco de dados com um resumo (campo `summary_ai` preenchido). Se voce nao esta vendo noticias novas, provavelmente nao ha noticias novas processadas no banco -- o mecanismo de refresh em si esta funcionando corretamente.

---

## Plano de implementacao: restaurar a aba Comunidade

### 1. Adicionar "Comunidade" ao menu inferior

**Arquivo**: `src/components/BottomNav.tsx`

- Adicionar um novo item no array `navItems` com `id: 'comunidade'`, `label: 'Comunidade'` e icone `Users`
- O menu ficara com 6 itens: Mercado, Explorar, Salvos, Comunidade, Academia, Perfil
- Reduzir o tamanho do texto dos labels para `text-[9px]` para acomodar 6 itens sem quebrar o layout

### 2. Adicionar a tela placeholder de Comunidade

**Arquivo**: `src/pages/Index.tsx`

- Adicionar um novo `case 'comunidade'` no `renderContent()` usando o componente `PlaceholderScreen` ja existente, com titulo "Comunidade" e descricao indicando que esta em desenvolvimento

---

## Detalhes tecnicos

### BottomNav.tsx -- novo array de itens

```
navItems = [
  { id: 'mercado',    label: 'Mercado',    icon: Home },
  { id: 'explorar',   label: 'Explorar',   icon: Compass },
  { id: 'salvos',     label: 'Salvos',     icon: Bookmark },
  { id: 'comunidade', label: 'Comunidade', icon: Users },
  { id: 'academia',   label: 'Academia',   icon: GraduationCap },
  { id: 'perfil',     label: 'Perfil',     icon: User },
]
```

### Index.tsx -- novo case no switch

```tsx
case 'comunidade':
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header>Comunidade</header>
      <PlaceholderScreen
        title="Comunidade"
        description="Conecte-se com outros profissionais do mercado imobiliario. Em desenvolvimento!"
        icon={<Users />}
      />
    </div>
  );
```

### Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `src/components/BottomNav.tsx` | Adicionar item "Comunidade" com icone `Users`, ajustar tamanho do texto |
| `src/pages/Index.tsx` | Adicionar `case 'comunidade'` no switch com `PlaceholderScreen` |
