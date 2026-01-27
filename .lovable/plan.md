
# Plano: Monitoramento Automatico para Limpar Exames Travados

## Objetivo

Implementar um sistema automatico que monitora e limpa exames travados no status "analyzing" ha mais de 5 minutos, utilizando uma combinacao de:
1. Database function para limpeza
2. Edge function para ser chamada periodicamente
3. Cron job usando pg_cron para agendar execucao automatica

---

## Arquitetura da Solucao

```text
+------------------+       +----------------------+       +------------------+
|  pg_cron         |       | Edge Function        |       | Database         |
|  (a cada 5 min)  | ----> | cleanup-stuck-exams  | ----> | Function         |
+------------------+       +----------------------+       | + UPDATE exams   |
                                                          +------------------+
```

---

## Implementacao

### 1. Criar Database Function

Uma funcao SQL que atualiza exames travados e retorna informacoes sobre os exames afetados:

```sql
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Criar Edge Function (cleanup-stuck-exams)

Nova Edge Function que pode ser chamada periodicamente:

**Arquivo:** `supabase/functions/cleanup-stuck-exams/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Chamar a funcao de limpeza
    const { data, error } = await supabase.rpc('cleanup_stuck_analyzing_exams');
    
    if (error) throw error;
    
    console.log('[cleanup-stuck-exams] Cleanup result:', data);
    
    return new Response(
      JSON.stringify({
        success: true,
        cleaned_count: data?.[0]?.cleaned_count || 0,
        exam_ids: data?.[0]?.exam_ids || [],
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[cleanup-stuck-exams] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
```

### 3. Configurar Cron Job com pg_cron

Agendar a execucao automatica a cada 5 minutos usando SQL:

```sql
-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar o cron job
SELECT cron.schedule(
  'cleanup-stuck-analyzing-exams',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://rhjgzlaksbmzyidybgyf.supabase.co/functions/v1/cleanup-stuck-exams',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoamd6bGFrc2JtenlpZHliZ3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzc0NzIsImV4cCI6MjA4NTA1MzQ3Mn0.R6FjKW10gQGamvPq06ASloqNkQZ67-Cs2b0EoPrRo4Q"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

### 4. Atualizar supabase/config.toml

Adicionar configuracao da nova Edge Function:

```toml
project_id = "rhjgzlaksbmzyidybgyf"

[functions.analyze-image]
verify_jwt = false

[functions.share-report]
verify_jwt = false

[functions.cleanup-stuck-exams]
verify_jwt = false
```

---

## Resumo de Arquivos

| Arquivo/Recurso | Acao | Descricao |
|-----------------|------|-----------|
| Database Function | Criar | `cleanup_stuck_analyzing_exams()` |
| `supabase/functions/cleanup-stuck-exams/index.ts` | Criar | Nova Edge Function |
| `supabase/config.toml` | Atualizar | Adicionar config da nova funcao |
| Cron Job | Configurar | Agendar via SQL |

---

## Beneficios

1. **Automatico**: Executa a cada 5 minutos sem intervencao manual
2. **Rastreavel**: Registra limpezas no audit_log
3. **Seguro**: Usa SECURITY DEFINER para acesso controlado
4. **Observavel**: Edge Function retorna metricas de limpeza
5. **Robusto**: Funciona mesmo se usuario fechar o navegador

---

## Fluxo de Operacao

```text
1. Cron job dispara a cada 5 minutos
   |
   v
2. Chama Edge Function cleanup-stuck-exams
   |
   v
3. Edge Function executa RPC cleanup_stuck_analyzing_exams()
   |
   v
4. Database Function:
   - Identifica exames com status='analyzing' e updated_at < 5min
   - Atualiza status para 'pending'
   - Registra no audit_log
   - Retorna contagem de exames limpos
   |
   v
5. Exames aparecem disponiveis para re-analise no frontend
```

---

## Monitoramento

Para verificar se o cron job esta funcionando:

```sql
-- Ver jobs agendados
SELECT * FROM cron.job;

-- Ver historico de execucoes
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

Para ver exames que foram limpos automaticamente:

```sql
SELECT * FROM audit_log 
WHERE action = 'auto_cleanup_stuck_exams' 
ORDER BY created_at DESC;
```
