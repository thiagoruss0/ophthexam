import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuracoes do pipeline
const CONFIG = {
  // Periodo de analise (dias)
  ANALYSIS_PERIOD_DAYS: 30,

  // Threshold minimo de feedback para considerar um padrao
  MIN_FEEDBACK_COUNT: 5,

  // Taxa de erro minima para gerar correcao (10%)
  MIN_ERROR_RATE: 0.10,

  // Taxa de erro para gerar alerta de falso positivo (15%)
  MIN_FALSE_POSITIVE_RATE: 0.15,

  // Dias de validade das correcoes
  CORRECTION_VALIDITY_DAYS: 90,
};

// Tipos
interface FeedbackRecord {
  id: string;
  exam_id: string;
  accuracy_rating: 'correct' | 'partially_correct' | 'incorrect';
  quality_feedback: 'agree' | 'disagree' | null;
  diagnosis_correct: string[] | null;
  diagnosis_added: string[] | null;
  diagnosis_removed: string[] | null;
  biomarkers_feedback: Record<string, boolean> | null;
  pathology_tags: string[] | null;
  created_at: string;
  exams: {
    exam_type: string;
  };
  ai_analysis: {
    diagnosis: string[] | null;
    biomarkers: Record<string, any> | null;
    quality_score: string | null;
  };
}

interface ErrorPattern {
  target: string;
  type: 'missed_diagnosis' | 'false_positive' | 'quality_disagreement' | 'biomarker_error';
  count: number;
  rate: number;
  examples: string[];
}

interface AnalysisResult {
  exam_type: string;
  total_feedback: number;
  patterns: ErrorPattern[];
  corrections_generated: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[analyze-feedback] Iniciando analise de feedback...');

    // Calcular periodo de analise
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - CONFIG.ANALYSIS_PERIOD_DAYS);

    // 1. Buscar todos os feedbacks do periodo
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('ai_feedback')
      .select(`
        id,
        exam_id,
        accuracy_rating,
        quality_feedback,
        diagnosis_correct,
        diagnosis_added,
        diagnosis_removed,
        biomarkers_feedback,
        pathology_tags,
        created_at,
        exams!inner(exam_type),
        ai_analysis!inner(diagnosis, biomarkers, quality_score)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (feedbackError) {
      throw new Error(`Erro ao buscar feedback: ${feedbackError.message}`);
    }

    const feedback = feedbackData as unknown as FeedbackRecord[];
    console.log(`[analyze-feedback] ${feedback.length} feedbacks encontrados no periodo`);

    if (feedback.length < CONFIG.MIN_FEEDBACK_COUNT) {
      return new Response(JSON.stringify({
        success: true,
        message: `Feedback insuficiente (${feedback.length}/${CONFIG.MIN_FEEDBACK_COUNT}). Aguardando mais dados.`,
        analyzed: feedback.length,
        corrections_generated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Agrupar por tipo de exame
    const feedbackByExamType = groupByExamType(feedback);

    // 3. Analisar padroes de erro para cada tipo
    const results: AnalysisResult[] = [];
    let totalCorrections = 0;

    for (const [examType, examFeedback] of Object.entries(feedbackByExamType)) {
      console.log(`[analyze-feedback] Analisando ${examType}: ${examFeedback.length} feedbacks`);

      const patterns = analyzeErrorPatterns(examFeedback);
      const significantPatterns = patterns.filter(p =>
        p.count >= CONFIG.MIN_FEEDBACK_COUNT &&
        p.rate >= CONFIG.MIN_ERROR_RATE
      );

      console.log(`[analyze-feedback] ${examType}: ${significantPatterns.length} padroes significativos encontrados`);

      // 4. Gerar correcoes para padroes significativos
      let correctionsGenerated = 0;

      for (const pattern of significantPatterns) {
        const correction = generateCorrection(pattern, examType);

        if (correction) {
          const { error: upsertError } = await supabase
            .from('prompt_configs')
            .upsert({
              exam_type: examType,
              config_type: correction.config_type,
              content: correction.content,
              priority: correction.priority,
              is_active: true,
              source_feedback_count: pattern.count,
              error_rate: pattern.rate,
              expires_at: new Date(Date.now() + CONFIG.CORRECTION_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'exam_type,config_type,(content->>\'target\')'
            });

          if (upsertError) {
            console.error(`[analyze-feedback] Erro ao salvar correcao: ${upsertError.message}`);
          } else {
            correctionsGenerated++;
            console.log(`[analyze-feedback] Correcao gerada: ${pattern.type} - ${pattern.target}`);
          }
        }
      }

      totalCorrections += correctionsGenerated;

      results.push({
        exam_type: examType,
        total_feedback: examFeedback.length,
        patterns: significantPatterns,
        corrections_generated: correctionsGenerated
      });
    }

    // 5. Registrar log da analise
    await supabase.from('feedback_analysis_log').insert({
      analysis_period_start: startDate.toISOString(),
      analysis_period_end: endDate.toISOString(),
      total_feedback_analyzed: feedback.length,
      patterns_found: results.reduce((acc, r) => {
        acc[r.exam_type] = r.patterns;
        return acc;
      }, {} as Record<string, ErrorPattern[]>),
      corrections_generated: totalCorrections,
      details_by_exam_type: results.reduce((acc, r) => {
        acc[r.exam_type] = {
          total_feedback: r.total_feedback,
          patterns_count: r.patterns.length,
          corrections: r.corrections_generated
        };
        return acc;
      }, {} as Record<string, any>)
    });

    // 6. Limpar correcoes expiradas
    const { data: cleanupResult } = await supabase.rpc('cleanup_expired_prompt_configs');
    console.log(`[analyze-feedback] ${cleanupResult || 0} correcoes expiradas desativadas`);

    const response = {
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      total_feedback_analyzed: feedback.length,
      results,
      total_corrections_generated: totalCorrections,
      expired_cleaned: cleanupResult || 0
    };

    console.log('[analyze-feedback] Analise concluida:', JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyze-feedback] Erro:', errorMessage);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// ============= FUNCOES AUXILIARES =============

function groupByExamType(feedback: FeedbackRecord[]): Record<string, FeedbackRecord[]> {
  return feedback.reduce((acc, fb) => {
    const examType = fb.exams?.exam_type;
    if (!examType) return acc;

    if (!acc[examType]) {
      acc[examType] = [];
    }
    acc[examType].push(fb);
    return acc;
  }, {} as Record<string, FeedbackRecord[]>);
}

function analyzeErrorPatterns(feedback: FeedbackRecord[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];
  const totalCount = feedback.length;

  // 1. Diagnosticos perdidos (medico adicionou)
  const missedDiagnoses: Record<string, string[]> = {};

  for (const fb of feedback) {
    if (fb.diagnosis_added && fb.diagnosis_added.length > 0) {
      for (const diag of fb.diagnosis_added) {
        const normalizedDiag = normalizeDiagnosis(diag);
        if (!missedDiagnoses[normalizedDiag]) {
          missedDiagnoses[normalizedDiag] = [];
        }
        missedDiagnoses[normalizedDiag].push(fb.exam_id);
      }
    }
  }

  for (const [diag, examIds] of Object.entries(missedDiagnoses)) {
    patterns.push({
      target: diag,
      type: 'missed_diagnosis',
      count: examIds.length,
      rate: examIds.length / totalCount,
      examples: examIds.slice(0, 5)
    });
  }

  // 2. Falsos positivos (medico removeu)
  const falsePositives: Record<string, string[]> = {};

  for (const fb of feedback) {
    if (fb.diagnosis_removed && fb.diagnosis_removed.length > 0) {
      for (const diag of fb.diagnosis_removed) {
        const normalizedDiag = normalizeDiagnosis(diag);
        if (!falsePositives[normalizedDiag]) {
          falsePositives[normalizedDiag] = [];
        }
        falsePositives[normalizedDiag].push(fb.exam_id);
      }
    }
  }

  for (const [diag, examIds] of Object.entries(falsePositives)) {
    patterns.push({
      target: diag,
      type: 'false_positive',
      count: examIds.length,
      rate: examIds.length / totalCount,
      examples: examIds.slice(0, 5)
    });
  }

  // 3. Discordancia de qualidade
  const qualityDisagreements = feedback.filter(fb => fb.quality_feedback === 'disagree');
  if (qualityDisagreements.length > 0) {
    patterns.push({
      target: 'quality_assessment',
      type: 'quality_disagreement',
      count: qualityDisagreements.length,
      rate: qualityDisagreements.length / totalCount,
      examples: qualityDisagreements.slice(0, 5).map(fb => fb.exam_id)
    });
  }

  // 4. Erros de biomarcadores
  const biomarkerErrors: Record<string, { missed: number; false: number; examIds: string[] }> = {};

  for (const fb of feedback) {
    if (fb.biomarkers_feedback) {
      for (const [biomarker, isCorrect] of Object.entries(fb.biomarkers_feedback)) {
        if (!isCorrect) {
          if (!biomarkerErrors[biomarker]) {
            biomarkerErrors[biomarker] = { missed: 0, false: 0, examIds: [] };
          }

          // Verificar se era falso positivo ou nao detectado
          const aiBiomarkers = fb.ai_analysis?.biomarkers || {};
          const aiDetected = aiBiomarkers[biomarker]?.present === true;

          if (aiDetected) {
            biomarkerErrors[biomarker].false++;
          } else {
            biomarkerErrors[biomarker].missed++;
          }
          biomarkerErrors[biomarker].examIds.push(fb.exam_id);
        }
      }
    }
  }

  for (const [biomarker, errors] of Object.entries(biomarkerErrors)) {
    const totalErrors = errors.missed + errors.false;
    if (totalErrors >= CONFIG.MIN_FEEDBACK_COUNT) {
      patterns.push({
        target: biomarker,
        type: 'biomarker_error',
        count: totalErrors,
        rate: totalErrors / totalCount,
        examples: errors.examIds.slice(0, 5)
      });
    }
  }

  // Ordenar por taxa de erro (maior primeiro)
  return patterns.sort((a, b) => b.rate - a.rate);
}

function normalizeDiagnosis(diagnosis: string): string {
  return diagnosis
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ');
}

function generateCorrection(
  pattern: ErrorPattern,
  examType: string
): { config_type: string; content: any; priority: number } | null {

  const ratePercent = (pattern.rate * 100).toFixed(1);

  switch (pattern.type) {
    case 'missed_diagnosis':
      return {
        config_type: 'correction',
        content: {
          target: pattern.target,
          type: 'missed_diagnosis',
          message: `ATENCAO ESPECIAL: O diagnostico "${pattern.target}" tem sido frequentemente nao detectado (${ratePercent}% dos casos). Analise cuidadosamente os sinais caracteristicos desta condicao.`,
          suggestion: getSuggestionsForDiagnosis(pattern.target, examType),
          severity: pattern.rate > 0.2 ? 'high' : 'medium',
          feedback_count: pattern.count,
          error_rate: pattern.rate
        },
        priority: Math.round(pattern.rate * 100)
      };

    case 'false_positive':
      return {
        config_type: 'exclusion',
        content: {
          target: pattern.target,
          type: 'false_positive',
          message: `CUIDADO: O diagnostico "${pattern.target}" tem gerado falsos positivos frequentes (${ratePercent}% dos casos). Seja mais rigoroso e exija criterios claros antes de reportar esta condicao.`,
          criteria: getCriteriaForDiagnosis(pattern.target, examType),
          severity: pattern.rate > 0.2 ? 'high' : 'medium',
          feedback_count: pattern.count,
          error_rate: pattern.rate
        },
        priority: Math.round(pattern.rate * 100)
      };

    case 'quality_disagreement':
      return {
        config_type: 'correction',
        content: {
          target: 'quality_assessment',
          type: 'quality_calibration',
          message: `CALIBRACAO DE QUALIDADE: A avaliacao de qualidade de imagem tem discordado dos medicos em ${ratePercent}% dos casos. Revise os criterios de qualidade.`,
          criteria: getQualityCriteria(examType),
          severity: 'medium',
          feedback_count: pattern.count,
          error_rate: pattern.rate
        },
        priority: 50
      };

    case 'biomarker_error':
      return {
        config_type: 'emphasis',
        content: {
          target: pattern.target,
          type: 'biomarker_attention',
          message: `BIOMARCADOR: "${pattern.target}" tem apresentado inconsistencias (${ratePercent}% dos casos). Preste atencao especial a este achado.`,
          characteristics: getBiomarkerCharacteristics(pattern.target, examType),
          severity: pattern.rate > 0.15 ? 'high' : 'medium',
          feedback_count: pattern.count,
          error_rate: pattern.rate
        },
        priority: Math.round(pattern.rate * 80)
      };

    default:
      return null;
  }
}

// ============= CONHECIMENTO ESPECIALIZADO =============

function getSuggestionsForDiagnosis(diagnosis: string, examType: string): string[] {
  const suggestions: Record<string, Record<string, string[]>> = {
    oct_macular: {
      'dmri seca': [
        'Procure por drusas de qualquer tamanho na regiao macular',
        'Verifique irregularidades no EPR',
        'Observe atrofia geografica ou alteracoes pigmentares'
      ],
      'dmri exsudativa': [
        'Identifique fluido subretiniano ou intraretiniano',
        'Procure DEP (descolamento do EPR)',
        'Verifique presenca de material hiperreflectivo sub-EPR'
      ],
      'edema macular diabetico': [
        'Meça a espessura foveal central',
        'Identifique cistos intraretinianos',
        'Procure exsudatos duros perifoveais'
      ],
      'membrana epirretiniana': [
        'Observe linha hiperreflectiva na superficie retiniana',
        'Verifique distorcao do contorno foveal',
        'Identifique pregas retinianas'
      ],
      'buraco macular': [
        'Avalie a depressao foveal',
        'Identifique defeito de espessura total',
        'Classifique o estadio (1-4)'
      ]
    },
    oct_nerve: {
      'glaucoma': [
        'Avalie a espessura da CFNR em todos os quadrantes',
        'Aplique a regra ISNT',
        'Procure defeitos em cunha na CFNR',
        'Verifique assimetria entre os olhos'
      ],
      'neuropatia optica': [
        'Observe edema do disco optico',
        'Verifique palidez do nervo',
        'Avalie a relacao escavacao/disco'
      ]
    },
    retinography: {
      'retinopatia diabetica': [
        'Procure microaneurismas',
        'Identifique hemorragias retinianas',
        'Verifique exsudatos duros e algodonosos',
        'Avalie neovascularizacao'
      ],
      'retinopatia hipertensiva': [
        'Observe estreitamento arteriolar',
        'Identifique cruzamentos AV patologicos',
        'Procure hemorragias em chama de vela'
      ]
    }
  };

  const examSuggestions = suggestions[examType] || {};
  const normalizedDiag = normalizeDiagnosis(diagnosis);

  // Busca aproximada
  for (const [key, value] of Object.entries(examSuggestions)) {
    if (normalizedDiag.includes(key) || key.includes(normalizedDiag)) {
      return value;
    }
  }

  return ['Revise criterios diagnosticos padrao para esta condicao'];
}

function getCriteriaForDiagnosis(diagnosis: string, examType: string): string[] {
  const criteria: Record<string, string[]> = {
    'dmri': [
      'Confirme presenca de drusas ou alteracoes do EPR',
      'Descarte outras causas de alteracao macular',
      'Considere idade do paciente (tipicamente > 50 anos)'
    ],
    'glaucoma': [
      'Confirme defeito na CFNR consistente com o quadro',
      'Verifique correlacao com campo visual se disponivel',
      'Avalie relacao C/D aumentada'
    ],
    'edema': [
      'Confirme aumento mensuravel da espessura',
      'Identifique causa subjacente',
      'Descarte artefatos de imagem'
    ]
  };

  const normalizedDiag = normalizeDiagnosis(diagnosis);

  for (const [key, value] of Object.entries(criteria)) {
    if (normalizedDiag.includes(key)) {
      return value;
    }
  }

  return ['Aplique criterios diagnosticos estritos', 'Confirme com achados multiplos'];
}

function getQualityCriteria(examType: string): string[] {
  const criteria: Record<string, string[]> = {
    oct_macular: [
      'Boa: Todas as camadas visiveis, centralizacao adequada, sem artefatos',
      'Moderada: Maioria das camadas visiveis, pequenos artefatos toleraveis',
      'Ruim: Camadas nao distinguiveis, artefatos significativos, descentralizada'
    ],
    oct_nerve: [
      'Boa: CFNR bem definida, disco centralizado, scan completo',
      'Moderada: CFNR parcialmente visivel, pequena descentralizacao',
      'Ruim: CFNR nao mensuravel, scan incompleto'
    ],
    retinography: [
      'Boa: Foco nitido, iluminacao uniforme, disco e macula visiveis',
      'Moderada: Foco aceitavel, leve opacidade de meios',
      'Ruim: Desfocada, reflexos, opacidade significativa'
    ]
  };

  return criteria[examType] || criteria.oct_macular;
}

function getBiomarkerCharacteristics(biomarker: string, examType: string): string[] {
  const characteristics: Record<string, string[]> = {
    'fluido_intraretiniano': [
      'Espacos hiporeflectivos dentro das camadas retinianas',
      'Bordas bem definidas (cistos) ou mal definidas (difuso)',
      'Localizacao: nuclear externa, plexiforme externa, outras'
    ],
    'fluido_subretiniano': [
      'Espaco hiporeflectivo entre neurorretina e EPR',
      'Elevacao da retina neurossensorial',
      'Pode conter material hiperreflectivo (sangue, fibrina)'
    ],
    'drusas': [
      'Elevacoes do EPR com conteudo variavel',
      'Duras: pequenas, bem definidas, hiperreflectivas',
      'Moles: maiores, bordas menos definidas'
    ],
    'membrana_epirretiniana': [
      'Linha hiperreflectiva na superficie retiniana interna',
      'Pode causar distorcao das camadas subjacentes',
      'Avalie grau de tracao e distorcao foveal'
    ],
    'atrofia_epr': [
      'Aumento da transmissao para coroide',
      'Perda da linha do EPR',
      'Frequentemente associada a perda de fotorreceptores'
    ]
  };

  const normalizedBiomarker = biomarker.toLowerCase().replace(/_/g, ' ');

  for (const [key, value] of Object.entries(characteristics)) {
    const normalizedKey = key.replace(/_/g, ' ');
    if (normalizedBiomarker.includes(normalizedKey) || normalizedKey.includes(normalizedBiomarker)) {
      return value;
    }
  }

  return ['Verifique criterios padrao para identificacao deste achado'];
}
