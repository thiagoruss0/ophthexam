-- Criar funcao para limpar exames travados em analyzing
CREATE OR REPLACE FUNCTION cleanup_stuck_analyzing_exams()
RETURNS TABLE(
  cleaned_count INTEGER,
  exam_ids UUID[]
) AS $$
DECLARE
  affected_ids UUID[];
  count_cleaned INTEGER;
BEGIN
  -- Coletar IDs dos exames que serao resetados
  SELECT ARRAY_AGG(id) INTO affected_ids
  FROM exams
  WHERE status = 'analyzing'
    AND updated_at < NOW() - INTERVAL '5 minutes';
  
  -- Atualizar status para pending
  UPDATE exams
  SET status = 'pending',
      updated_at = NOW()
  WHERE status = 'analyzing'
    AND updated_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS count_cleaned = ROW_COUNT;
  
  -- Registrar no audit_log para rastreabilidade
  IF count_cleaned > 0 THEN
    INSERT INTO audit_log (action, table_name, new_data)
    VALUES (
      'auto_cleanup_stuck_exams',
      'exams',
      jsonb_build_object(
        'cleaned_count', count_cleaned,
        'exam_ids', affected_ids,
        'cleanup_time', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT count_cleaned, COALESCE(affected_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;