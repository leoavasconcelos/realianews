
# Plano: Painel de Administração REalia

## Visao Geral

Criaremos um painel de administração completo e seguro para o REalia, com hierarquia de roles (Admin e Moderador), dashboard gerencial, gestao de conteudo e metricas detalhadas.

---

## 1. Sistema de Roles (Seguranca)

### Estrutura do Banco de Dados

Criaremos uma tabela separada para roles (seguindo as melhores praticas de seguranca):

```text
+------------------+       +------------------+
|   auth.users     |       |   user_roles     |
+------------------+       +------------------+
| id (uuid) PK     |<------| user_id (uuid)   |
+------------------+       | role (app_role)  |
                          +------------------+

app_role ENUM: 'admin', 'moderator'
```

### Permissoes por Role

| Funcionalidade | Admin | Moderador |
|----------------|-------|-----------|
| Dashboard completo | Sim | Sim |
| Gerenciar noticias | Sim | Sim |
| Gerenciar topicos | Sim | Nao |
| Gerenciar fontes | Sim | Nao |
| Ver usuarios | Sim | Nao |
| Gerenciar roles | Sim | Nao |
| Metricas completas | Sim | Parcial |

---

## 2. Arquitetura do Painel

### Rotas

```text
/admin                 -> Dashboard principal
/admin/news            -> Gerenciamento de noticias
/admin/news/:id/edit   -> Editar noticia
/admin/topics          -> Gerenciamento de topicos
/admin/sources         -> Gerenciamento de fontes
/admin/users           -> Visualizacao de usuarios
/admin/analytics       -> Metricas e analytics
```

### Layout

```text
+-----------------------------------------------+
| Header (Logo + Usuario Logado + Logout)       |
+-------+---------------------------------------+
|       |                                       |
| Side  |    Conteudo Principal                 |
| bar   |                                       |
|       |                                       |
| - Dashboard                                   |
| - Noticias                                    |
| - Topicos *                                   |
| - Fontes *                                    |
| - Usuarios *                                  |
| - Analytics                                   |
|       |                                       |
+-------+---------------------------------------+
* Visivel apenas para Admins
```

---

## 3. Dashboard Principal

### Metricas em Tempo Real

**Cards Superiores:**
- Total de noticias publicadas
- Noticias pendentes de moderacao
- Total de usuarios cadastrados
- Usuarios ativos (ultimos 7 dias)

**Graficos:**
- Noticias por regiao (pie chart)
- Cadastros por dia (line chart - ultimos 30 dias)
- Noticias por topico (bar chart)
- Engajamento (noticias salvas por dia)

**Tabela de Atividades Recentes:**
- Ultimos usuarios cadastrados
- Ultimas noticias agregadas
- Ultimas interacoes (saves)

---

## 4. Gerenciamento de Noticias

### Lista de Noticias

```text
+--------------------------------------------------+
| Filtros: [Regiao v] [Topico v] [Status v] [Busca]|
+--------------------------------------------------+
| Titulo           | Fonte    | Regiao | Data    |A|
+--------------------------------------------------+
| Noticia exemplo  | Valor    | Brazil | 20/01   |E|
| Outra noticia    | InfoMoney| USA    | 19/01   |E|
+--------------------------------------------------+
```

### Acoes por Noticia
- Editar (titulo, resumo AI, topicos, regiao)
- Marcar como trending
- Deletar
- Visualizar original (link externo)

---

## 5. Gerenciamento de Topicos (Admin Only)

### Funcionalidades
- Listar todos os topicos
- Adicionar novo topico (nome, slug, icone, descricao)
- Editar topico existente
- Desativar topico (soft delete)

---

## 6. Gerenciamento de Fontes (Admin Only)

### Funcionalidades
- Listar todas as fontes RSS
- Adicionar nova fonte (nome, URL base, logo)
- Ativar/desativar fonte
- Ver estatisticas de noticias por fonte

---

## 7. Visualizacao de Usuarios (Admin Only)

### Lista de Usuarios

```text
+--------------------------------------------------+
| Nome          | Email           | Regioes | Data |
+--------------------------------------------------+
| Leonardo      | leo@...         | 5       | 21/01|
| Usuario 2     | user@...        | 1       | 20/01|
+--------------------------------------------------+
```

### Detalhes do Usuario
- Interesses selecionados
- Regioes preferidas
- Noticias salvas (quantidade)
- Configuracoes de notificacao

---

## 8. Analytics e Metricas

### Metricas Gerais
- Total de usuarios por periodo
- Taxa de retencao
- Usuarios por regiao de interesse
- Topicos mais populares

### Metricas de Conteudo
- Noticias agregadas por dia
- Noticias por fonte
- Noticias por regiao
- Taxa de sucesso de sumarizacao AI

### Metricas de Engajamento
- Noticias salvas por dia
- Top 10 noticias mais salvas
- Horarios de maior acesso

---

## 9. Migracoes de Banco de Dados

### Migracao 1: Enum e Tabela de Roles

```sql
-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Funcao segura para verificar roles (evita recursao)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Migracao 2: Adicionar Seu Usuario como Admin

```sql
-- Adicionar Leonardo como admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('3359348c-b58d-4e81-804b-fed45a4ec3d7', 'admin');
```

### Migracao 3: Policies Atualizadas para Tabelas Existentes

```sql
-- News: Admins e moderadores podem gerenciar
CREATE POLICY "Admins and moderators can manage news"
ON public.news FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Topics: Apenas admins podem gerenciar
CREATE POLICY "Admins can manage topics"
ON public.topics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Sources: Apenas admins podem gerenciar
CREATE POLICY "Admins can manage sources"
ON public.sources FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: Admins podem ver todos
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

## 10. Componentes a Criar

### Estrutura de Arquivos

```text
src/
  pages/
    admin/
      AdminLayout.tsx        # Layout com sidebar
      Dashboard.tsx          # Pagina inicial
      NewsManagement.tsx     # Gerenciar noticias
      NewsEdit.tsx           # Editar noticia
      TopicsManagement.tsx   # Gerenciar topicos
      SourcesManagement.tsx  # Gerenciar fontes
      UsersManagement.tsx    # Ver usuarios
      Analytics.tsx          # Metricas
  components/
    admin/
      AdminSidebar.tsx       # Sidebar do admin
      AdminHeader.tsx        # Header do admin
      StatsCard.tsx          # Card de estatistica
      DataTable.tsx          # Tabela reutilizavel
      AdminGuard.tsx         # Protecao de rota
  hooks/
    useAdminAuth.ts          # Hook de autenticacao admin
    useAdminStats.ts         # Hook de estatisticas
```

---

## 11. Fluxo de Autenticacao Admin

```text
Usuario acessa /admin
        |
        v
   Esta logado?
    /        \
  Nao        Sim
   |          |
   v          v
Redireciona   Tem role admin/moderator?
para login    /                    \
             Nao                   Sim
              |                     |
              v                     v
         Mostra erro           Carrega painel
         "Sem permissao"       apropriado
```

---

## Resumo de Arquivos

| Arquivo | Descricao |
|---------|-----------|
| Migracao SQL | Criar tabela user_roles + funcao has_role + policies |
| src/pages/admin/AdminLayout.tsx | Layout principal com sidebar |
| src/pages/admin/Dashboard.tsx | Dashboard com metricas |
| src/pages/admin/NewsManagement.tsx | CRUD de noticias |
| src/pages/admin/TopicsManagement.tsx | CRUD de topicos |
| src/pages/admin/SourcesManagement.tsx | CRUD de fontes |
| src/pages/admin/UsersManagement.tsx | Visualizacao de usuarios |
| src/pages/admin/Analytics.tsx | Metricas detalhadas |
| src/components/admin/AdminGuard.tsx | Protecao de rotas |
| src/hooks/useAdminAuth.ts | Hook de verificacao de roles |
| src/App.tsx | Adicionar rotas /admin/* |

---

## Ordem de Implementacao

1. Criar migracao de banco de dados (roles + policies)
2. Criar hook useAdminAuth
3. Criar componente AdminGuard
4. Criar AdminLayout com sidebar
5. Criar Dashboard com metricas basicas
6. Criar NewsManagement
7. Criar TopicsManagement
8. Criar SourcesManagement
9. Criar UsersManagement
10. Criar Analytics
11. Conectar rotas no App.tsx
