-- =============================================
-- AI Learning Metrics System
-- =============================================

-- 1. Tabela para armazenar snapshots de métricas da IA
CREATE TABLE public.ai_metrics_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_analyses INTEGER NOT NULL DEFAULT 0,
  total_feedbacks INTEGER NOT NULL DEFAULT 0,
  reference_cases_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  correct_rate NUMERIC(5,2) DEFAULT 0,
  partial_rate NUMERIC(5,2) DEFAULT 0,
  incorrect_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Métricas por tipo de exame (JSON)
  metrics_by_exam_type JSONB DEFAULT '{}',
  
  -- Diagnósticos mais removidos/adicionados
  top_removed_diagnoses JSONB DEFAULT '[]',
  top_added_diagnoses JSONB DEFAULT '[]',
  
  -- Tags de patologia mais comuns
  top_pathology_tags JSONB DEFAULT '[]',
  
  -- Métricas de validação Zod
  validation_success_rate NUMERIC(5,2) DEFAULT 0,
  common_validation_warnings JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Uma snapshot por dia
  CONSTRAINT unique_snapshot_date UNIQUE (snapshot_date)
);

-- 2. Índices para otimizar consultas de feedback
CREATE INDEX IF NOT EXISTS idx_ai_feedback_is_reference ON ai_feedback(is_reference_case) WHERE is_reference_case = true;
CREATE INDEX IF NOT EXISTS idx_ai_feedback_accuracy ON ai_feedback(accuracy_rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(overall_rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_exam_doctor ON ai_feedback(exam_id, doctor_id);

-- 3. Índices para ai_analysis
CREATE INDEX IF NOT EXISTS idx_ai_analysis_exam ON ai_analysis(exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_analyzed ON ai_analysis(analyzed_at DESC);

-- 4. Função para calcular e salvar snapshot de métricas
CREATE OR REPLACE FUNCTION public.calculate_ai_metrics_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_analyses INTEGER;
  v_total_feedbacks INTEGER;
  v_reference_count INTEGER;
  v_avg_rating NUMERIC(3,2);
  v_correct_count INTEGER;
  v_partial_count INTEGER;
  v_incorrect_count INTEGER;
  v_metrics_by_type JSONB;
  v_removed_diagnoses JSONB;
  v_added_diagnoses JSONB;
  v_pathology_tags JSONB;
  v_validation_success NUMERIC(5,2);
  v_validation_warnings JSONB;
BEGIN
  -- Total de análises
  SELECT COUNT(*) INTO v_total_analyses FROM ai_analysis;
  
  -- Total de feedbacks
  SELECT COUNT(*) INTO v_total_feedbacks FROM ai_feedback;
  
  -- Casos de referência
  SELECT COUNT(*) INTO v_reference_count FROM ai_feedback WHERE is_reference_case = true;
  
  -- Rating médio
  SELECT COALESCE(AVG(overall_rating), 0)::NUMERIC(3,2) INTO v_avg_rating 
  FROM ai_feedback WHERE overall_rating IS NOT NULL;
  
  -- Contagem por precisão
  SELECT COUNT(*) INTO v_correct_count FROM ai_feedback WHERE accuracy_rating = 'correct';
  SELECT COUNT(*) INTO v_partial_count FROM ai_feedback WHERE accuracy_rating = 'partially_correct';
  SELECT COUNT(*) INTO v_incorrect_count FROM ai_feedback WHERE accuracy_rating = 'incorrect';
  
  -- Métricas por tipo de exame
  SELECT COALESCE(jsonb_object_agg(exam_type, metrics), '{}')
  INTO v_metrics_by_type
  FROM (
    SELECT 
      e.exam_type,
      jsonb_build_object(
        'correct', COUNT(*) FILTER (WHERE f.accuracy_rating = 'correct'),
        'partial', COUNT(*) FILTER (WHERE f.accuracy_rating = 'partially_correct'),
        'incorrect', COUNT(*) FILTER (WHERE f.accuracy_rating = 'incorrect'),
        'total', COUNT(*)
      ) as metrics
    FROM ai_feedback f
    JOIN exams e ON e.id = f.exam_id
    GROUP BY e.exam_type
  ) sub;
  
  -- Top diagnósticos removidos
  SELECT COALESCE(jsonb_agg(item), '[]')
  INTO v_removed_diagnoses
  FROM (
    SELECT jsonb_build_object('diagnosis', d, 'count', cnt) as item
    FROM (
      SELECT unnest(diagnosis_removed) as d, COUNT(*) as cnt
      FROM ai_feedback
      WHERE diagnosis_removed IS NOT NULL
      GROUP BY unnest(diagnosis_removed)
      ORDER BY cnt DESC
      LIMIT 10
    ) sub
  ) agg;
  
  -- Top diagnósticos adicionados
  SELECT COALESCE(jsonb_agg(item), '[]')
  INTO v_added_diagnoses
  FROM (
    SELECT jsonb_build_object('diagnosis', d, 'count', cnt) as item
    FROM (
      SELECT unnest(diagnosis_added) as d, COUNT(*) as cnt
      FROM ai_feedback
      WHERE diagnosis_added IS NOT NULL
      GROUP BY unnest(diagnosis_added)
      ORDER BY cnt DESC
      LIMIT 10
    ) sub
  ) agg;
  
  -- Top tags de patologia
  SELECT COALESCE(jsonb_agg(item), '[]')
  INTO v_pathology_tags
  FROM (
    SELECT jsonb_build_object('tag', t, 'count', cnt) as item
    FROM (
      SELECT unnest(pathology_tags) as t, COUNT(*) as cnt
      FROM ai_feedback
      WHERE pathology_tags IS NOT NULL
      GROUP BY unnest(pathology_tags)
      ORDER BY cnt DESC
      LIMIT 15
    ) sub
  ) agg;
  
  -- Taxa de sucesso de validação (baseado em raw_response._validation.isValid)
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE (raw_response->'_validation'->>'isValid')::boolean = true)::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE raw_response->'_validation' IS NOT NULL), 0) * 100),
      0
    )::NUMERIC(5,2)
  INTO v_validation_success
  FROM ai_analysis;
  
  -- Inserir ou atualizar snapshot
  INSERT INTO ai_metrics_snapshot (
    snapshot_date,
    total_analyses,
    total_feedbacks,
    reference_cases_count,
    avg_rating,
    correct_rate,
    partial_rate,
    incorrect_rate,
    metrics_by_exam_type,
    top_removed_diagnoses,
    top_added_diagnoses,
    top_pathology_tags,
    validation_success_rate,
    common_validation_warnings
  ) VALUES (
    CURRENT_DATE,
    v_total_analyses,
    v_total_feedbacks,
    v_reference_count,
    v_avg_rating,
    CASE WHEN v_total_feedbacks > 0 THEN (v_correct_count::NUMERIC / v_total_feedbacks * 100) ELSE 0 END,
    CASE WHEN v_total_feedbacks > 0 THEN (v_partial_count::NUMERIC / v_total_feedbacks * 100) ELSE 0 END,
    CASE WHEN v_total_feedbacks > 0 THEN (v_incorrect_count::NUMERIC / v_total_feedbacks * 100) ELSE 0 END,
    v_metrics_by_type,
    v_removed_diagnoses,
    v_added_diagnoses,
    v_pathology_tags,
    v_validation_success,
    '[]'::jsonb
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    total_analyses = EXCLUDED.total_analyses,
    total_feedbacks = EXCLUDED.total_feedbacks,
    reference_cases_count = EXCLUDED.reference_cases_count,
    avg_rating = EXCLUDED.avg_rating,
    correct_rate = EXCLUDED.correct_rate,
    partial_rate = EXCLUDED.partial_rate,
    incorrect_rate = EXCLUDED.incorrect_rate,
    metrics_by_exam_type = EXCLUDED.metrics_by_exam_type,
    top_removed_diagnoses = EXCLUDED.top_removed_diagnoses,
    top_added_diagnoses = EXCLUDED.top_added_diagnoses,
    top_pathology_tags = EXCLUDED.top_pathology_tags,
    validation_success_rate = EXCLUDED.validation_success_rate,
    created_at = now();
END;
$$;

-- 5. Trigger para atualizar métricas após novo feedback
CREATE OR REPLACE FUNCTION public.trigger_update_metrics_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Chamar função de atualização de métricas de forma assíncrona
  PERFORM calculate_ai_metrics_snapshot();
  RETURN NEW;
END;
$$;

-- Criar trigger apenas para INSERT (novos feedbacks)
DROP TRIGGER IF EXISTS update_metrics_on_feedback ON ai_feedback;
CREATE TRIGGER update_metrics_on_feedback
  AFTER INSERT ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_metrics_on_feedback();

-- 6. Habilitar RLS na tabela de métricas
ALTER TABLE public.ai_metrics_snapshot ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver métricas
CREATE POLICY "Admins can view metrics snapshots"
  ON public.ai_metrics_snapshot
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Apenas o sistema pode inserir (via função SECURITY DEFINER)
CREATE POLICY "System can insert metrics"
  ON public.ai_metrics_snapshot
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update metrics"
  ON public.ai_metrics_snapshot
  FOR UPDATE
  USING (true);

-- 7. Função helper para obter métricas mais recentes
CREATE OR REPLACE FUNCTION public.get_latest_ai_metrics()
RETURNS SETOF ai_metrics_snapshot
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM ai_metrics_snapshot 
  ORDER BY snapshot_date DESC 
  LIMIT 1;
$$;

-- 8. Função para obter tendência de métricas (últimos N dias)
CREATE OR REPLACE FUNCTION public.get_ai_metrics_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  snapshot_date DATE,
  avg_rating NUMERIC,
  correct_rate NUMERIC,
  total_feedbacks INTEGER,
  reference_cases_count INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    snapshot_date,
    avg_rating,
    correct_rate,
    total_feedbacks,
    reference_cases_count
  FROM ai_metrics_snapshot
  WHERE snapshot_date >= CURRENT_DATE - days_back
  ORDER BY snapshot_date ASC;
$$;