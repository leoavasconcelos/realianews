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

-- Funcao segura para verificar roles (evita recursao infinita)
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

-- Funcao auxiliar para verificar se usuario e admin OU moderador
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

-- Policy: Admins podem gerenciar todos os roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Usuarios podem ver seus proprios roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- News: Admins e moderadores podem gerenciar (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins and moderators can insert news"
ON public.news FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can update news"
ON public.news FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can delete news"
ON public.news FOR DELETE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- Topics: Apenas admins podem gerenciar
CREATE POLICY "Admins can insert topics"
ON public.topics FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update topics"
ON public.topics FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete topics"
ON public.topics FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Sources: Apenas admins podem gerenciar
CREATE POLICY "Admins can insert sources"
ON public.sources FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sources"
ON public.sources FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sources"
ON public.sources FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));