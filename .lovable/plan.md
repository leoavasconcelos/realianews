
# Plano: Tornar Criação de Conta Obrigatória

## Objetivo
Remover todas as opções que permitem ao usuário acessar a plataforma sem criar uma conta. O usuário **deve** se autenticar antes de poder usar o aplicativo.

---

## Situação Atual

O onboarding permite "pular" a autenticação em vários pontos:

| Local | Elemento | Linha |
|-------|----------|-------|
| AuthModalContent.tsx | Botão "Continuar sem conta" | 335-341 |
| OnboardingModal.tsx | Prop `showSkip={true}` | 185-186 |
| OnboardingModal.tsx | Função `handleSkipAuth()` | 80-83 |
| OnboardingModal.tsx | Botão "Pular por agora" (interesses) | 345-355 |
| OnboardingModal.tsx | Botão "Pular por agora" (regiões) | 357-364 |

---

## Mudanças Necessárias

### 1. OnboardingModal.tsx

**Remover:**
- Prop `showSkip={true}` do AuthModalContent (linha 186)
- Função `handleSkipAuth` (linhas 80-83)
- Botão "Pular por agora" na etapa de interesses (linhas 345-355)
- Botão "Pular por agora" na etapa de regiões (linhas 357-364)

**Lógica ajustada:**
- O usuário só avança da etapa 1 (auth) quando `handleAuthSuccess` é chamado
- Não há mais caminho alternativo para pular

### 2. AuthModalContent.tsx

**Remover:**
- Props `onSkip` e `showSkip` da interface (linhas 43-44)
- Botão "Continuar sem conta" (linhas 335-341)
- Lógica relacionada ao skip no componente

---

## Novo Fluxo de Onboarding

```text
Etapa 0: Boas-vindas
     |
     v
Etapa 1: Login / Cadastro (OBRIGATÓRIO)
     |
     v (só avança após autenticação bem-sucedida)
     |
Etapa 2: Seleção de Interesses (obrigatório - mínimo 1)
     |
     v
Etapa 3: Preferências Internacionais (obrigatório - escolher sim ou não)
     |
     v
Feed Principal
```

---

## Arquivos a Modificar

### Arquivo 1: `src/components/OnboardingModal.tsx`

- Remover `showSkip` da chamada do `AuthModalContent`
- Remover `onSkip={handleSkipAuth}`
- Remover função `handleSkipAuth`
- Remover botões "Pular por agora" nas etapas 2 e 3

### Arquivo 2: `src/components/AuthModalContent.tsx`

- Remover props `onSkip` e `showSkip` da interface
- Remover bloco do botão "Continuar sem conta"

---

## Comportamento Esperado

1. Usuário abre o app → vê tela de boas-vindas
2. Clica "Começar" → vai para tela de login/cadastro
3. **Não há opção de pular** → deve fazer login ou criar conta
4. Após autenticação → avança para seleção de interesses
5. Deve selecionar pelo menos 1 interesse → avança para regiões
6. Deve escolher preferência de regiões → acessa o feed

---

## Considerações de UX

- O usuário fica "preso" na tela de autenticação até fazer login
- Botão de voltar continua disponível para retornar à tela de boas-vindas
- Mensagens claras sobre a necessidade de conta para usar o app
