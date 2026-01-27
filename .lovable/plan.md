
# Plano: Sistema de Notificações com Resumo Diário

## Visão Geral
Implementar sistema de notificações via **Push Web (PWA)** e **E-mail** que envia um resumo diário das principais notícias do mercado imobiliário para os usuários.

---

## Pré-requisito: Adicionar Secret RESEND_API_KEY

Antes de implementar, você precisa adicionar a chave da API do Resend:
1. Clique no botão "Add Secret" que aparecerá
2. Cole a chave API do Resend que você criou

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE NOTIFICAÇÕES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────┐  │
│  │   Frontend   │────▶│  Edge Function   │────▶│   Resend    │  │
│  │  (Service    │     │  send-daily-     │     │   (Email)   │  │
│  │   Worker)    │     │  digest          │     └─────────────┘  │
│  └──────────────┘     └──────────────────┘                      │
│         │                      │                                 │
│         │                      ▼                                 │
│         │             ┌──────────────────┐                      │
│         └────────────▶│   Supabase DB    │                      │
│           Push Token  │  - profiles      │                      │
│           Storage     │  - push_tokens   │                      │
│                       │  - news          │                      │
│                       └──────────────────┘                      │
│                                │                                 │
│                                ▼                                 │
│                       ┌──────────────────┐                      │
│                       │   Cron Job       │                      │
│                       │   (08:00 BRT)    │                      │
│                       └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Implementar

### 1. Alterações no Banco de Dados

**Nova tabela `push_subscriptions`:**
- `id` (UUID, chave primária)
- `user_id` (UUID, referência ao perfil do usuário)
- `endpoint` (TEXT, URL do serviço de push)
- `p256dh` (TEXT, chave pública do navegador)
- `auth` (TEXT, token de autenticação)
- `created_at` (TIMESTAMP)

**Novos campos na tabela `profiles`:**
- `email_notifications_enabled` (BOOLEAN, default true)
- `push_notifications_enabled` (BOOLEAN, default false)
- `notification_time` (TEXT, default "08:00" - horário do digest)

### 2. Edge Functions (Backend)

**`send-daily-digest`** - Função principal que:
- Busca as top 5 notícias das últimas 24 horas
- Para cada usuário com notificações ativas:
  - Filtra notícias pelos interesses do usuário
  - Envia e-mail via Resend com template HTML bonito
  - Envia push notification (se habilitado)
- Será executada via cron job às 08:00 BRT

**`manage-push-subscription`** - Gerencia tokens push:
- Salva/atualiza subscription do navegador
- Remove subscription quando usuário desativa

### 3. Service Worker (PWA)

**`public/sw.js`:**
- Registra service worker para push notifications
- Processa e exibe notificações recebidas
- Gerencia cliques nas notificações (abre o app)

### 4. Componentes Frontend

**`NotificationSettings.tsx`:**
- Toggle para e-mail notifications
- Toggle para push notifications (com solicitação de permissão)
- Seletor de horário preferido para o digest
- Preview do próximo envio

**Atualização do `ProfileScreen.tsx`:**
- Conectar item "Notificações" ao modal de configurações

### 5. Hooks Customizados

**`usePushNotifications.ts`:**
- Verificar suporte do navegador
- Solicitar permissão
- Gerenciar subscription
- Sincronizar com backend

**`useNotificationSettings.ts`:**
- Gerenciar preferências do usuário
- Atualizar perfil no banco de dados

---

## Template do E-mail (Resumo Diário)

Design limpo e responsivo com:
- Logo REalia no header
- Saudação personalizada
- Lista das 5 principais notícias com:
  - Título
  - Resumo curto (2 linhas)
  - Badge de tópico
  - Link "Ler mais"
- Footer com links para configurações e app

---

## Cron Job

Configuração para executar às 08:00 horário de Brasília:
```sql
SELECT cron.schedule(
  'send-daily-digest',
  '0 11 * * *',  -- 11:00 UTC = 08:00 BRT
  -- chamada da edge function
);
```

---

## Fluxo do Usuário

1. Usuário acessa Perfil > Notificações
2. Ativa "Resumo por E-mail" e/ou "Push Notifications"
3. Se ativar Push, navegador solicita permissão
4. Preferências são salvas no banco
5. Diariamente às 08:00 BRT, recebe o resumo

---

## Sequência de Implementação

1. **Fase 1 - Infraestrutura:**
   - Adicionar secret RESEND_API_KEY
   - Criar migration para novas colunas/tabelas
   - Criar edge function `send-daily-digest`

2. **Fase 2 - E-mail:**
   - Implementar template de e-mail
   - Testar envio manual

3. **Fase 3 - Push Web:**
   - Criar service worker
   - Implementar hook de push notifications
   - Edge function para gerenciar subscriptions

4. **Fase 4 - Interface:**
   - Criar tela de configurações de notificações
   - Integrar com ProfileScreen

5. **Fase 5 - Automação:**
   - Configurar cron job para envio diário

---

## Detalhes Técnicos

### Edge Function: send-daily-digest

```typescript
// Estrutura principal
- Buscar top 5 notícias (últimas 24h, ordenadas por is_trending)
- Buscar usuários com email_notifications_enabled = true
- Para cada usuário:
  - Filtrar notícias pelos interesses (se houver)
  - Montar HTML do e-mail
  - Enviar via Resend
- Retornar estatísticas de envio
```

### Service Worker

```javascript
// Eventos principais
- 'push': Receber e exibir notificação
- 'notificationclick': Abrir app na notícia
- 'install/activate': Lifecycle do SW
```

### Domínio de E-mail

O e-mail será enviado de `noreply@SEU-DOMINIO-VERIFICADO.com` (você precisará verificar um domínio no Resend, ou usar o sandbox para testes).
