-- Corrigir políticas RLS da tabela ai_metrics_snapshot
-- Remover políticas permissivas e usar abordagem mais segura

-- Remover políticas antigas
DROP POLICY IF EXISTS "System can insert metrics" ON public.ai_metrics_snapshot;
DROP POLICY IF EXISTS "System can update metrics" ON public.ai_metrics_snapshot;

-- Como a tabela só é modificada via funções SECURITY DEFINER,
-- não precisamos de políticas INSERT/UPDATE para usuários normais.
-- As funções SECURITY DEFINER bypassam RLS automaticamente.

-- A única política necessária é SELECT para admins (já existe)