

# Integrar a Nova Logomarca do REalia no App

## Resumo

Substituir o logotipo atual (gerado por SVG inline) pela nova logomarca oficial em todos os pontos do aplicativo onde ela aparece.

## O que muda

A imagem enviada (IMG_0106.png) sera copiada para o projeto e o componente `Logo.tsx` sera atualizado para usar a imagem real em vez do icone SVG desenhado em codigo. O texto "REalia" e a tagline continuam sendo renderizados pelo componente para flexibilidade de tamanho e estilo.

## Locais impactados

O componente `Logo.tsx` e utilizado em **7 telas/componentes**:

1. **FeedHeader** - cabecalho do feed (tamanho sm, texto com gradiente)
2. **AuthModal** - modal de login
3. **AuthModalContent** - conteudo do modal de autenticacao
4. **OnboardingModal** - tela de onboarding (tamanho xl)
5. **PasswordResetModal** - modal de redefinicao de senha
6. **ProfileScreen** - rodape do perfil
7. **AdminHeader** - cabecalho do painel admin

Como todos importam o mesmo componente `Logo.tsx`, a mudanca e centralizada -- basta atualizar um unico arquivo.

## Etapas

1. **Copiar a imagem** para `src/assets/realia-logo.png`
2. **Atualizar `Logo.tsx`**: substituir o bloco SVG inline por um `<img>` que importa a imagem do assets
3. **Adicionar favicon** (opcional): copiar tambem para `public/` para uso como favicon e meta tags OG

---

## Detalhes Tecnicos

### 1. Copiar o asset

```
user-uploads://IMG_0106.png -> src/assets/realia-logo.png
```

### 2. Alterar `src/components/Logo.tsx`

- Importar a imagem: `import realiLogo from '@/assets/realia-logo.png'`
- Substituir o bloco `<div>` que contem o SVG e os gradientes por:
  ```tsx
  <img
    src={realiLogo}
    alt="REalia"
    className={sizeClasses[size]}
  />
  ```
- Manter toda a logica de `showText`, `useGradientText`, tamanhos e `forwardRef` intacta
- Remover o SVG inline, os divs de gradiente metalico e reflexo que nao serao mais necessarios

### 3. Favicon e meta tags (opcional)

- Copiar a imagem para `public/realia-logo.png`
- Atualizar `index.html` para referenciar o novo favicon e imagens OG

