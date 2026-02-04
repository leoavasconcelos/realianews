
# Plano: Reestruturar Onboarding com Login e Preferências Internacionais

## Visao Geral
Reestruturar o fluxo de onboarding para:
1. Exibir a tela de login/cadastro antes da seleção de interesses
2. Adicionar uma nova etapa para preferências de notícias internacionais
3. Permitir que o usuário escolha quais regiões do mundo lhe interessam

---

## Novo Fluxo de Onboarding

```text
Etapa 0: Boas-vindas
     |
     v
Etapa 1: Login / Cadastro (obrigatório ou pular)
     |
     v
Etapa 2: Seleção de Interesses (Residencial, Comercial, etc.)
     |
     v
Etapa 3: Preferências Internacionais
     |
     v
Feed Principal
```

---

## O que será feito

### 1. Atualizar Banco de Dados
Adicionar nova coluna `preferred_regions` na tabela `profiles` para armazenar as regiões selecionadas:
- Tipo: `jsonb` com array de strings (ex: `["USA", "Europe"]`)
- Default: `["Brazil"]` (apenas notícias nacionais)

### 2. Refatorar OnboardingModal
Transformar em um fluxo de 4 etapas:

| Etapa | Conteúdo |
|-------|----------|
| 0 | Tela de boas-vindas (já existe) |
| 1 | Autenticação integrada (login/cadastro/social) |
| 2 | Seleção de temas de interesse (já existe) |
| 3 | Preferências de notícias internacionais |

### 3. Nova Tela de Preferências Internacionais (Etapa 3)

```text
+------------------------------------------+
|                                          |
|  Notícias Internacionais                 |
|  Deseja acompanhar mercados globais?     |
|                                          |
|  [ ] Sim, me interessa                   |
|  [ ] Não, apenas Brasil                  |
|                                          |
|  (Se "Sim" selecionado:)                 |
|                                          |
|  Quais regiões?                          |
|  +------------------+ +----------------+ |
|  | [x] EUA         | | [ ] Europa     | |
|  | Americas        | | UK, Alemanha...| |
|  +------------------+ +----------------+ |
|  +------------------+ +----------------+ |
|  | [ ] Oriente M.  | | [ ] Mundo      | |
|  | Dubai, Arabia...| | Asia, Oceania  | |
|  +------------------+ +----------------+ |
|                                          |
+------------------------------------------+
```

### 4. Atualizar Componente AuthModal
Criar versão "inline" para ser usada dentro do OnboardingModal:
- Remover backdrop/overlay
- Adaptar layout para integração fluida
- Manter todas as funcionalidades (Google, Apple, email)

### 5. Atualizar useAuth Hook
Adicionar `preferred_regions` ao tipo Profile e função updateProfile

---

## Alterações Técnicas Detalhadas

### Arquivo 1: Migração do Banco de Dados
```sql
ALTER TABLE profiles 
ADD COLUMN preferred_regions jsonb DEFAULT '["Brazil"]'::jsonb;
```

### Arquivo 2: `src/hooks/useAuth.ts`
- Adicionar `preferred_regions: string[]` ao tipo Profile
- Incluir na função updateProfile

### Arquivo 3: `src/components/OnboardingModal.tsx`
Refatorar completamente:
- Novo estado: `step` (0-3), `selectedInterests`, `interestedInInternational`, `selectedRegions`
- Importar AuthModalContent (versão inline)
- Adicionar etapa 3 com seleção de regiões
- Atualizar callback `onComplete` para receber interesses e regiões

### Arquivo 4: `src/components/AuthModalContent.tsx` (novo)
Extrair o conteúdo do AuthModal para componente reutilizável:
- Aceitar prop `inline?: boolean` para estilo sem overlay
- Aceitar prop `onSuccess?: () => void` para callback após login

### Arquivo 5: `src/pages/Index.tsx`
Atualizar handler `handleOnboardingComplete`:
- Receber também `preferredRegions`
- Salvar no perfil do usuário
- Aplicar filtro inicial de região se usuário não quiser internacional

---

## Regiões Disponíveis

Baseado no sistema existente (REGIONS em useNews.ts):

| ID | Label | Descrição |
|----|-------|-----------|
| Brazil | Brasil | Notícias nacionais (padrão) |
| USA | EUA | Estados Unidos |
| Europe | Europa | Reino Unido, Alemanha, França, etc. |
| Middle East | Oriente Médio | Dubai, Arabia Saudita, etc. |
| World | Mundo | Asia, Oceania, consultorias globais |

---

## Fluxo do Usuário

1. **Abre o app** - Vê tela de boas-vindas
2. **Clica "Começar"** - Vai para etapa de login
3. **Faz login/cadastro** - Ou clica "Continuar sem conta"
4. **Seleciona interesses** - Escolhe temas do mercado imobiliário
5. **Preferências internacionais** - Escolhe se quer notícias globais
6. **Se sim** - Seleciona quais regiões (pode marcar várias)
7. **Finaliza** - Dados salvos no perfil, feed personalizado

---

## Persistência de Dados

Para usuários não autenticados:
- Salvar preferências em `localStorage`
- Aplicar ao perfil quando fizer login posteriormente

Para usuários autenticados:
- Salvar diretamente na tabela `profiles`

---

## Passos de Implementação

1. Criar migração para adicionar coluna `preferred_regions`
2. Atualizar tipo Profile no `useAuth.ts`
3. Criar componente `AuthModalContent.tsx` (versão inline)
4. Refatorar `OnboardingModal.tsx` com novo fluxo de 4 etapas
5. Atualizar `Index.tsx` para lidar com novos dados do onboarding
6. Testar fluxo completo
