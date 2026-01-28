import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(length = 32): string {
  // Use cryptographically secure random values
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { exam_id, expires_in_hours = 72 } = await req.json();

    if (!exam_id) {
      console.error('No exam_id provided');
      return new Response(
        JSON.stringify({ error: 'exam_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating share token for exam: ${exam_id}, expires in ${expires_in_hours} hours`);

    const shareToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

    // Check if report already exists for this exam
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('id')
      .eq('exam_id', exam_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing report:', fetchError);
      throw fetchError;
    }

    if (existingReport) {
      console.log(`Updating existing report ${existingReport.id} with share token`);
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          share_token: shareToken,
          share_expires_at: expiresAt.toISOString(),
        })
        .eq('exam_id', exam_id);

      if (updateError) {
        console.error('Error updating report:', updateError);
        throw updateError;
      }
    } else {
      console.log('Creating new report with share token');
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          exam_id,
          share_token: shareToken,
          share_expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Error inserting report:', insertError);
        throw insertError;
      }
    }

    const origin = req.headers.get('origin') || 'https://ophthexam.lovable.app';
    const shareUrl = `${origin}/laudo/${shareToken}`;

    console.log(`Share URL generated: ${shareUrl}, expires at: ${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        share_url: shareUrl, 
        expires_at: expiresAt.toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Share report error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
