-- Tabela de feedback do médico sobre a análise da IA
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  ai_analysis_id UUID REFERENCES ai_analysis(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Avaliações principais
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  accuracy_rating TEXT CHECK (accuracy_rating IN ('correct', 'partially_correct', 'incorrect')),
  
  -- Feedback de qualidade da imagem
  quality_feedback TEXT CHECK (quality_feedback IN ('agree', 'disagree')),
  quality_correct TEXT,
  
  -- Feedback de diagnósticos
  diagnosis_feedback TEXT CHECK (diagnosis_feedback IN ('agree', 'partially_agree', 'disagree')),
  diagnosis_added TEXT[],
  diagnosis_removed TEXT[],
  diagnosis_correct TEXT[],
  
  -- Feedback detalhado (JSONB para flexibilidade)
  biomarkers_feedback JSONB,
  measurements_feedback JSONB,
  
  -- Comentários
  general_comments TEXT,
  teaching_notes TEXT,
  
  -- Metadados para treinamento
  is_reference_case BOOLEAN DEFAULT FALSE,
  case_difficulty TEXT CHECK (case_difficulty IN ('easy', 'moderate', 'difficult', 'rare')),
  pathology_tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para evitar feedback duplicado
  CONSTRAINT unique_feedback_per_exam_doctor UNIQUE (exam_id, doctor_id)
);

-- Índices para performance
CREATE INDEX idx_ai_feedback_exam ON public.ai_feedback(exam_id);
CREATE INDEX idx_ai_feedback_doctor ON public.ai_feedback(doctor_id);
CREATE INDEX idx_ai_feedback_rating ON public.ai_feedback(overall_rating);
CREATE INDEX idx_ai_feedback_reference ON public.ai_feedback(is_reference_case) WHERE is_reference_case = true;

-- Habilitar RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Policies usando funções SECURITY DEFINER existentes
CREATE POLICY "Doctors can insert own feedback" ON public.ai_feedback
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Doctors can view own feedback" ON public.ai_feedback
  FOR SELECT TO authenticated
  USING (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Doctors can update own feedback" ON public.ai_feedback
  FOR UPDATE TO authenticated
  USING (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Admins can view all feedback" ON public.ai_feedback
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_feedback_updated_at
  BEFORE UPDATE ON public.ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função RPC para contagem eficiente de exames sem feedback
CREATE OR REPLACE FUNCTION count_exams_without_feedback(doctor_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM exams e
  WHERE e.doctor_id = doctor_profile_id
    AND e.status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM ai_feedback f
      WHERE f.exam_id = e.id
        AND f.doctor_id = doctor_profile_id
    );
$$;