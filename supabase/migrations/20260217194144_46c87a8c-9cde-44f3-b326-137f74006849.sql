
-- Admin pode atualizar qualquer perfil
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin pode deletar qualquer perfil
CREATE POLICY "Admins can delete all profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
