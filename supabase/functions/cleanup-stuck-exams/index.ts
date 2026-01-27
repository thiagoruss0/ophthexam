import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[cleanup-stuck-exams] Starting cleanup of stuck analyzing exams...');
    
    // Chamar a funcao de limpeza
    const { data, error } = await supabase.rpc('cleanup_stuck_analyzing_exams');
    
    if (error) {
      console.error('[cleanup-stuck-exams] Database function error:', error);
      throw error;
    }
    
    const cleanedCount = data?.[0]?.cleaned_count || 0;
    const examIds = data?.[0]?.exam_ids || [];
    
    console.log('[cleanup-stuck-exams] Cleanup result:', { 
      cleaned_count: cleanedCount, 
      exam_ids: examIds 
    });
    
    if (cleanedCount > 0) {
      console.log(`[cleanup-stuck-exams] Successfully reset ${cleanedCount} stuck exams to pending status`);
    } else {
      console.log('[cleanup-stuck-exams] No stuck exams found');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        cleaned_count: cleanedCount,
        exam_ids: examIds,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cleanup-stuck-exams] Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
