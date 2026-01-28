-- ============================================
-- FASE 1: Pipeline de Aprendizado da IA
-- Tabela de configuracoes dinamicas de prompts
-- ============================================

-- Tabela para armazenar correcoes e ajustes de prompts
CREATE TABLE IF NOT EXISTS prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de exame (oct_macular, oct_nerve, retinography)
  exam_type TEXT NOT NULL,

  -- Tipo de configuracao
  -- 'correction' = correcoes baseadas em erros
  -- 'emphasis' = enfases em achados especificos
  -- 'exclusion' = padroes a evitar (falsos positivos)
  config_type TEXT NOT NULL CHECK (config_type IN ('correction', 'emphasis', 'exclusion')),

  -- Conteudo da configuracao (JSON flexivel)
  content JSONB NOT NULL DEFAULT '{}',

  -- Prioridade (maior = mais importante)
  priority INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metricas de origem
  source_feedback_count INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL,

  -- Quem criou (NULL = sistema automatico)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraint unica para evitar duplicatas
  CONSTRAINT unique_exam_config UNIQUE (exam_type, config_type, (content->>'target'))
);

-- Indices para busca rapida
CREATE INDEX idx_prompt_configs_exam_type ON prompt_configs(exam_type) WHERE is_active = true;
CREATE INDEX idx_prompt_configs_active ON prompt_configs(is_active, priority DESC);
CREATE INDEX idx_prompt_configs_expires ON prompt_configs(expires_at) WHERE expires_at IS NOT NULL;

-- Tabela de historico de analises de feedback
CREATE TABLE IF NOT EXISTS feedback_analysis_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Periodo analisado
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,

  -- Metricas gerais
  total_feedback_analyzed INTEGER DEFAULT 0,

  -- Padroes encontrados (JSON)
  patterns_found JSONB DEFAULT '{}',

  -- Correcoes geradas
  corrections_generated INTEGER DEFAULT 0,

  -- Detalhes por tipo de exame
  details_by_exam_type JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indice para buscar analises recentes
CREATE INDEX idx_feedback_analysis_log_date ON feedback_analysis_log(created_at DESC);

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_prompt_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prompt_configs_updated
  BEFORE UPDATE ON prompt_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_configs_timestamp();

-- Funcao para buscar configuracoes ativas por tipo de exame
CREATE OR REPLACE FUNCTION get_active_prompt_configs(p_exam_type TEXT)
RETURNS TABLE (
  config_type TEXT,
  content JSONB,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.config_type,
    pc.content,
    pc.priority
  FROM prompt_configs pc
  WHERE pc.exam_type = p_exam_type
    AND pc.is_active = true
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
  ORDER BY pc.priority DESC, pc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para desativar correcoes expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_prompt_configs()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE prompt_configs
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE prompt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analysis_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e editar tudo
CREATE POLICY "Admins can manage prompt_configs"
  ON prompt_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Todos os usuarios autenticados podem ler configs ativas
CREATE POLICY "Authenticated users can read active configs"
  ON prompt_configs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins podem ver logs de analise
CREATE POLICY "Admins can view feedback_analysis_log"
  ON feedback_analysis_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Comentarios
COMMENT ON TABLE prompt_configs IS 'Configuracoes dinamicas de prompts baseadas em feedback dos medicos';
COMMENT ON COLUMN prompt_configs.config_type IS 'Tipo: correction (correcoes), emphasis (enfases), exclusion (evitar falsos positivos)';
COMMENT ON COLUMN prompt_configs.content IS 'JSON com detalhes da correcao: target, message, examples, etc';
COMMENT ON TABLE feedback_analysis_log IS 'Log de execucoes do pipeline de analise de feedback';
