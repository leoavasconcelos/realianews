

# Redesign da Barra de Filtros e Renomear "Atelier" para "Mercado"

## Problema Atual

A segunda linha do feed (abaixo do header) possui dois elementos competindo no mesmo espaco:
- **FilterPills** (categorias como "Todos", "Residencial", etc.) ocupa o lado esquerdo
- **RegionFilter** (botao "Todas" com icone de globo) ocupa o lado direito
- Em telas pequenas ou com muitas categorias, os pills ficam cortados e sobrepostos ao botao de regiao
- Visualmente confuso: "Todos" (categoria) e "Todas" (regiao) na mesma linha gera ambiguidade

## Solucao Proposta

### 1. Separar Filtros em Duas Linhas Distintas

Reorganizar a area de filtros em duas linhas visuais bem definidas:

**Linha 1 - Regiao (contexto geografico):**
- Mover o seletor de regiao para uma linha propria acima das categorias
- Exibir como pills horizontais compactos (Brasil, EUA, Europa, etc.) em vez de dropdown
- A regiao ativa tera destaque com a cor accent (Burnt Orange)
- Adicionar label sutil "Regiao" a esquerda para clareza

**Linha 2 - Categorias (topicos):**
- As FilterPills ocupam toda a largura sem competir com outro elemento
- Scroll horizontal livre sem obstrucao
- Mantido o visual atual dos pills

Essa separacao elimina a sobreposicao e torna claro o que cada linha controla.

### 2. Renomear "Atelier" para "Mercado"

Trocar todas as referencias de "atelier" para "mercado" no app:
- BottomNav: label "Atelier" vira "Mercado"
- Index.tsx: tab id "atelier" vira "mercado"
- Icone mantem o Home (casa) que combina com mercado imobiliario

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Index.tsx` | Separar FilterPills e RegionFilter em duas linhas. Trocar "atelier" por "mercado" no activeTab e switch/case |
| `src/components/RegionFilter.tsx` | Redesign de dropdown para pills horizontais inline com estilo premium |
| `src/components/BottomNav.tsx` | Trocar id e label de "atelier"/"Atelier" para "mercado"/"Mercado" |

## Detalhes Tecnicos

### Layout da area de filtros (Index.tsx)

A div atual com `flex items-center gap-3` que coloca tudo na mesma linha sera substituida por duas divs empilhadas:

```text
+--------------------------------------------------+
| [Globe icon] Brasil | EUA | Europa | Oriente M.   |  <- Linha 1: Regioes (pills)
+--------------------------------------------------+
| Todos | Residencial | Comercial | Luxo | ...      |  <- Linha 2: Categorias (pills)
+--------------------------------------------------+
```

### RegionFilter.tsx - De Dropdown para Pills

O componente deixa de ser um `DropdownMenu` e passa a renderizar botoes inline usando o mesmo estilo dos FilterPills, mas com tamanho menor e cor accent para o estado ativo. Adiciona o icone Globe a esquerda como indicador visual de que sao regioes.

### BottomNav.tsx

Apenas uma troca de string:
- `id: 'atelier'` -> `id: 'mercado'`
- `label: 'Atelier'` -> `label: 'Mercado'`

