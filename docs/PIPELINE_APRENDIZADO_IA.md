# Pipeline de Aprendizado para IA Oftalmologica
## Guia Tecnico de Implementacao

---

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Abordagem 1: Prompt Engineering Dinamico](#2-abordagem-1-prompt-engineering-dinamico)
3. [Abordagem 2: Few-Shot Learning com Casos de Referencia](#3-abordagem-2-few-shot-learning-com-casos-de-referencia)
4. [Abordagem 3: RAG - Retrieval Augmented Generation](#4-abordagem-3-rag---retrieval-augmented-generation)
5. [Abordagem 4: Fine-Tuning de Modelo](#5-abordagem-4-fine-tuning-de-modelo)
6. [Arquitetura Recomendada](#6-arquitetura-recomendada)
7. [Implementacao Passo a Passo](#7-implementacao-passo-a-passo)

---

## 1. Visao Geral

### Estado Atual do Sistema

O sistema OphthExam coleta feedback valioso dos medicos:

```typescript
// Dados coletados no ai_feedback
{
  overall_rating: 1-5,           // Avaliacao geral
  accuracy_rating: "correct|partially_correct|incorrect",
  quality_feedback: "agree|disagree",
  diagnosis_correct: string[],   // Diagnosticos confirmados
  diagnosis_added: string[],     // Diagnosticos faltantes
  diagnosis_removed: string[],   // Diagnosticos incorretos
  is_reference_case: boolean,    // Caso de referencia
  case_difficulty: "easy|moderate|difficult|rare",
  pathology_tags: string[],      // Tags de patologias
  teaching_notes: string         // Notas didaticas
}
```

### Problema

O feedback e apenas exportado como JSON (`AiMetrics.tsx:212-245`). Nao existe pipeline para usar esses dados automaticamente.

### Solucao

Implementar um sistema de **aprendizado continuo** que use o feedback para melhorar as analises futuras.

---

## 2. Abordagem 1: Prompt Engineering Dinamico

### Conceito

Ajustar os prompts automaticamente baseado nos erros recorrentes identificados no feedback.

### Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ai_feedback   │────▶│  Analise Erros   │────▶│ Prompt Ajustado │
│    (tabela)     │     │   (scheduled)    │     │   (dinamico)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         │              ┌────────▼────────┐               │
         │              │ prompt_configs  │◀──────────────┘
         │              │   (nova tabela) │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    analyze-image function                        │
│  1. Carrega prompt base                                          │
│  2. Carrega ajustes dinamicos de prompt_configs                  │
│  3. Monta prompt final com correcoes                             │
└─────────────────────────────────────────────────────────────────┘
```

### Implementacao

#### 2.1 Nova Tabela: `prompt_configs`

```sql
-- Migracao: add_prompt_configs_table.sql
CREATE TABLE prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL, -- oct_macular, oct_nerve, retinography
  config_type TEXT NOT NULL, -- 'correction', 'emphasis', 'example'
  content JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Indice para busca rapida
CREATE INDEX idx_prompt_configs_exam_type ON prompt_configs(exam_type, is_active);
```

#### 2.2 Funcao de Analise de Erros (Edge Function)

```typescript
// supabase/functions/analyze-feedback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Buscar feedback dos ultimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: feedback } = await supabase
    .from('ai_feedback')
    .select(`
      *,
      exams!inner(exam_type),
      ai_analysis!inner(diagnosis, biomarkers, findings)
    `)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // 2. Agrupar erros por tipo de exame
  const errorPatterns: Record<string, {
    missed_diagnoses: Record<string, number>,
    false_positives: Record<string, number>,
    quality_disagreements: number,
    total_feedback: number
  }> = {};

  for (const fb of feedback || []) {
    const examType = fb.exams?.exam_type;
    if (!examType) continue;

    if (!errorPatterns[examType]) {
      errorPatterns[examType] = {
        missed_diagnoses: {},
        false_positives: {},
        quality_disagreements: 0,
        total_feedback: 0
      };
    }

    const pattern = errorPatterns[examType];
    pattern.total_feedback++;

    // Diagnosticos faltantes (a IA nao detectou)
    if (fb.diagnosis_added?.length > 0) {
      for (const diag of fb.diagnosis_added) {
        pattern.missed_diagnoses[diag] = (pattern.missed_diagnoses[diag] || 0) + 1;
      }
    }

    // Falsos positivos (a IA detectou incorretamente)
    if (fb.diagnosis_removed?.length > 0) {
      for (const diag of fb.diagnosis_removed) {
        pattern.false_positives[diag] = (pattern.false_positives[diag] || 0) + 1;
      }
    }

    // Discordancia na qualidade
    if (fb.quality_feedback === 'disagree') {
      pattern.quality_disagreements++;
    }
  }

  // 3. Gerar correcoes para prompts
  for (const [examType, pattern] of Object.entries(errorPatterns)) {
    const corrections: string[] = [];

    // Diagnosticos frequentemente perdidos (>10% dos casos)
    const threshold = pattern.total_feedback * 0.1;

    for (const [diag, count] of Object.entries(pattern.missed_diagnoses)) {
      if (count >= threshold) {
        corrections.push(
          `ATENCAO: O diagnostico "${diag}" tem sido frequentemente nao detectado. ` +
          `Preste atencao especial aos sinais de ${diag} na imagem.`
        );
      }
    }

    // Falsos positivos frequentes
    for (const [diag, count] of Object.entries(pattern.false_positives)) {
      if (count >= threshold) {
        corrections.push(
          `CUIDADO: O diagnostico "${diag}" tem gerado falsos positivos. ` +
          `Seja mais rigoroso ao identificar ${diag} - exija criterios claros.`
        );
      }
    }

    // Salvar correcoes se houver
    if (corrections.length > 0) {
      await supabase
        .from('prompt_configs')
        .upsert({
          exam_type: examType,
          config_type: 'correction',
          content: { corrections },
          priority: 10,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'exam_type,config_type'
        });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    patterns: errorPatterns
  }));
});
```

#### 2.3 Modificar analyze-image para usar correcoes

```typescript
// Em analyze-image/index.ts, adicionar funcao:

async function buildDynamicPrompt(
  supabase: SupabaseClient,
  examType: string,
  basePrompt: string
): Promise<string> {
  // Buscar correcoes ativas
  const { data: configs } = await supabase
    .from('prompt_configs')
    .select('content, config_type')
    .eq('exam_type', examType)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!configs || configs.length === 0) {
    return basePrompt;
  }

  // Montar secao de correcoes
  const corrections = configs
    .filter(c => c.config_type === 'correction')
    .flatMap(c => c.content.corrections || []);

  if (corrections.length === 0) {
    return basePrompt;
  }

  // Inserir correcoes no prompt
  const correctionSection = `
## CORRECOES BASEADAS EM FEEDBACK MEDICO

As seguintes observacoes sao baseadas em feedback de medicos especialistas:

${corrections.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Leve estas observacoes em consideracao durante a analise.
`;

  // Inserir antes da secao "IMPORTANTE"
  return basePrompt.replace(
    'IMPORTANTE:',
    `${correctionSection}\n\nIMPORTANTE:`
  );
}

// Uso no handler principal:
const dynamicPrompt = await buildDynamicPrompt(supabase, exam_type, OCT_MACULAR_PROMPT);
```

### Vantagens
- Baixa complexidade de implementacao
- Nao requer treinamento de modelo
- Resultados visiveis rapidamente
- Facil de ajustar e reverter

### Desvantagens
- Limitado a ajustes textuais
- Nao aprende padroes visuais novos
- Pode sobrecarregar o prompt com muitas correcoes

---

## 3. Abordagem 2: Few-Shot Learning com Casos de Referencia

### Conceito

Incluir exemplos de casos de referencia (marcados pelos medicos) diretamente nos prompts para guiar a IA.

### Arquitetura

```
┌─────────────────┐
│  ai_feedback    │
│ is_reference=   │
│     true        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ reference_cases │────▶│  Selecao de      │
│  (view/tabela)  │     │  Casos Similares │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────┐
│              Prompt com Exemplos             │
│  "Aqui esta um exemplo de diagnostico       │
│   correto de DMRI: [imagem] [diagnostico]"  │
└─────────────────────────────────────────────┘
```

### Implementacao

#### 3.1 View Materializada de Casos de Referencia

```sql
-- Migracao: add_reference_cases_view.sql
CREATE MATERIALIZED VIEW reference_cases_mv AS
SELECT
  f.id as feedback_id,
  f.exam_id,
  e.exam_type,
  e.eye,
  f.diagnosis_correct as validated_diagnosis,
  f.pathology_tags,
  f.case_difficulty,
  f.teaching_notes,
  f.overall_rating,
  a.findings,
  a.biomarkers,
  a.measurements,
  a.diagnosis as ai_diagnosis,
  img.image_url
FROM ai_feedback f
JOIN exams e ON f.exam_id = e.id
JOIN ai_analysis a ON f.ai_analysis_id = a.id
JOIN exam_images img ON e.id = img.exam_id
WHERE f.is_reference_case = true
  AND f.overall_rating >= 4
  AND f.accuracy_rating = 'correct';

-- Indice para busca por tipo e patologia
CREATE INDEX idx_ref_cases_type ON reference_cases_mv(exam_type);
CREATE INDEX idx_ref_cases_tags ON reference_cases_mv USING GIN(pathology_tags);

-- Funcao para refresh automatico
CREATE OR REPLACE FUNCTION refresh_reference_cases()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY reference_cases_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_reference_cases
AFTER INSERT OR UPDATE ON ai_feedback
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_reference_cases();
```

#### 3.2 Funcao para Buscar Casos Similares

```typescript
// supabase/functions/get-reference-cases/index.ts

interface ReferenceCase {
  exam_type: string;
  validated_diagnosis: string[];
  pathology_tags: string[];
  findings: any;
  teaching_notes: string;
  image_url: string;
}

async function getReferenceCases(
  supabase: SupabaseClient,
  examType: string,
  limit: number = 2
): Promise<ReferenceCase[]> {
  const { data, error } = await supabase
    .from('reference_cases_mv')
    .select('*')
    .eq('exam_type', examType)
    .order('overall_rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reference cases:', error);
    return [];
  }

  return data || [];
}
```

#### 3.3 Construir Prompt com Exemplos

```typescript
// Em analyze-image/index.ts

async function buildFewShotPrompt(
  supabase: SupabaseClient,
  examType: string,
  basePrompt: string
): Promise<{ prompt: string; exampleImages: string[] }> {
  const cases = await getReferenceCases(supabase, examType, 2);

  if (cases.length === 0) {
    return { prompt: basePrompt, exampleImages: [] };
  }

  const exampleSection = cases.map((c, i) => `
### Exemplo ${i + 1}: ${c.pathology_tags?.join(', ') || 'Caso de referencia'}

**Diagnostico validado por especialista:**
${c.validated_diagnosis?.join(', ') || 'Normal'}

**Achados principais:**
${JSON.stringify(c.findings, null, 2)}

${c.teaching_notes ? `**Notas didaticas:** ${c.teaching_notes}` : ''}
`).join('\n');

  const enhancedPrompt = `
${basePrompt}

## EXEMPLOS DE REFERENCIA

Os seguintes casos foram validados por medicos especialistas. Use-os como referencia para sua analise:

${exampleSection}

Agora analise a imagem fornecida seguindo os padroes demonstrados acima.
`;

  return {
    prompt: enhancedPrompt,
    exampleImages: cases.map(c => c.image_url).filter(Boolean)
  };
}
```

#### 3.4 Enviar Exemplos como Imagens (Multimodal)

```typescript
// Modificar a chamada da API para incluir imagens de exemplo

const { prompt, exampleImages } = await buildFewShotPrompt(supabase, exam_type, basePrompt);

// Construir array de conteudo multimodal
const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

// Adicionar prompt
content.push({ type: 'text', text: prompt });

// Adicionar imagens de exemplo (se disponivel)
for (const imgUrl of exampleImages) {
  const base64 = await fetchImageAsBase64(imgUrl);
  if (base64) {
    content.push({
      type: 'image_url',
      image_url: { url: base64 }
    });
    content.push({
      type: 'text',
      text: '(Exemplo de referencia acima)'
    });
  }
}

// Adicionar imagem do exame atual
for (const img of examImages) {
  content.push({
    type: 'image_url',
    image_url: { url: img.base64 }
  });
}

content.push({
  type: 'text',
  text: 'Analise a(s) imagem(ns) acima (excluindo os exemplos de referencia).'
});
```

### Vantagens
- Exemplos concretos melhoram precisao
- Aproveita validacao medica
- Nao requer treinamento de modelo

### Desvantagens
- Aumenta tamanho do prompt (mais tokens)
- Limitado a poucos exemplos
- Selecao de casos pode nao ser otima

---

## 4. Abordagem 3: RAG - Retrieval Augmented Generation

### Conceito

Usar embeddings para buscar casos similares semanticamente e fornecer contexto relevante para cada analise.

### Arquitetura

```
                    ┌─────────────────┐
                    │  Nova Imagem    │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐
│ Embedding Model │──│ Vector Search │──│  Top-K Casos    │
│  (CLIP/etc)     │  │  (pgvector)   │  │   Similares     │
└─────────────────┘  └───────────────┘  └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Contexto Rico   │
          │ + Prompt Base   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │  Gemini 2.5 Pro │
          └─────────────────┘
```

### Implementacao

#### 4.1 Habilitar pgvector no Supabase

```sql
-- Habilitar extensao pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de embeddings
CREATE TABLE image_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  embedding vector(512), -- CLIP produz vetores de 512 dimensoes
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indice para busca de similaridade
CREATE INDEX idx_embeddings_vector ON image_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Funcao de busca de casos similares
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding vector(512),
  exam_type_filter TEXT,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  exam_id UUID,
  similarity FLOAT,
  validated_diagnosis TEXT[],
  findings JSONB,
  teaching_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.exam_id,
    1 - (ie.embedding <=> query_embedding) as similarity,
    f.diagnosis_correct as validated_diagnosis,
    a.findings,
    f.teaching_notes
  FROM image_embeddings ie
  JOIN exams e ON ie.exam_id = e.id
  JOIN ai_analysis a ON e.id = a.exam_id
  JOIN ai_feedback f ON e.id = f.exam_id
  WHERE e.exam_type = exam_type_filter
    AND f.is_reference_case = true
    AND f.accuracy_rating = 'correct'
    AND 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

#### 4.2 Servico de Embedding (Nova Edge Function)

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Usar modelo CLIP via Hugging Face Inference API
const HF_API_URL = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";

serve(async (req) => {
  const { image_base64 } = await req.json();

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get('HF_API_KEY')}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: image_base64,
      options: { wait_for_model: true }
    })
  });

  const embedding = await response.json();

  return new Response(JSON.stringify({ embedding }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

#### 4.3 Pipeline RAG Completo

```typescript
// supabase/functions/analyze-image-rag/index.ts

async function analyzeWithRAG(
  supabase: SupabaseClient,
  examId: string,
  imageBase64: string,
  examType: string
): Promise<AnalysisResult> {

  // 1. Gerar embedding da imagem atual
  const { data: embeddingResult } = await supabase.functions.invoke(
    'generate-embedding',
    { body: { image_base64: imageBase64 } }
  );

  const queryEmbedding = embeddingResult.embedding;

  // 2. Buscar casos similares no banco vetorial
  const { data: similarCases } = await supabase.rpc('search_similar_cases', {
    query_embedding: queryEmbedding,
    exam_type_filter: examType,
    match_threshold: 0.75,
    match_count: 3
  });

  // 3. Construir contexto com casos similares
  let context = '';
  if (similarCases && similarCases.length > 0) {
    context = `
## CASOS SIMILARES ENCONTRADOS NO BANCO DE DADOS

Os seguintes casos tem imagens visualmente similares e foram validados por especialistas:

${similarCases.map((c, i) => `
### Caso Similar ${i + 1} (${(c.similarity * 100).toFixed(1)}% similar)
- **Diagnostico validado:** ${c.validated_diagnosis?.join(', ') || 'Nao especificado'}
- **Achados:** ${JSON.stringify(c.findings)}
${c.teaching_notes ? `- **Notas:** ${c.teaching_notes}` : ''}
`).join('\n')}

Use estes casos como referencia, mas analise a imagem atual de forma independente.
`;
  }

  // 4. Combinar com prompt base
  const finalPrompt = `${OCT_MACULAR_PROMPT}\n\n${context}`;

  // 5. Chamar API de IA com contexto enriquecido
  const response = await callGeminiAPI(finalPrompt, imageBase64);

  // 6. Salvar embedding para uso futuro
  await supabase.from('image_embeddings').insert({
    exam_id: examId,
    image_url: imageBase64.substring(0, 100), // Apenas referencia
    embedding: queryEmbedding,
    metadata: { exam_type: examType }
  });

  return response;
}
```

### Vantagens
- Busca semantica por similaridade visual
- Escala bem com muitos casos
- Contexto altamente relevante

### Desvantagens
- Complexidade alta de implementacao
- Requer servico de embedding (custo adicional)
- Latencia adicional por chamada

---

## 5. Abordagem 4: Fine-Tuning de Modelo

### Conceito

Treinar um modelo customizado especificamente para oftalmologia usando os casos validados.

### Opcoes de Fine-Tuning

| Modelo | Custo | Complexidade | Qualidade |
|--------|-------|--------------|-----------|
| Gemini (Google) | Alto | Media | Alta |
| GPT-4V (OpenAI) | Alto | Media | Alta |
| LLaVA (Open Source) | Baixo | Alta | Media |
| BiomedCLIP + LLM | Medio | Alta | Alta |

### Arquitetura para Fine-Tuning

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE DE TREINAMENTO                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Coleta de   │──▶│  Preparacao  │──▶│   Upload p/  │    │
│  │   Dataset    │   │   JSONL      │   │   Provider   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Fine-Tune   │──▶│  Validacao   │──▶│   Deploy     │    │
│  │   Job        │   │   Metricas   │   │   Modelo     │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementacao

#### 5.1 Exportar Dataset para Fine-Tuning

```typescript
// supabase/functions/export-training-data/index.ts

interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
}

async function exportTrainingData(supabase: SupabaseClient): Promise<TrainingExample[]> {
  // Buscar casos de referencia com alta avaliacao
  const { data: cases } = await supabase
    .from('ai_feedback')
    .select(`
      diagnosis_correct,
      teaching_notes,
      pathology_tags,
      exams!inner(
        exam_type,
        eye,
        exam_images(image_url)
      ),
      ai_analysis!inner(
        findings,
        biomarkers,
        measurements,
        diagnosis,
        recommendations
      )
    `)
    .eq('is_reference_case', true)
    .gte('overall_rating', 4)
    .eq('accuracy_rating', 'correct');

  const trainingData: TrainingExample[] = [];

  for (const c of cases || []) {
    const examType = c.exams?.exam_type;
    const imageUrl = c.exams?.exam_images?.[0]?.image_url;

    if (!imageUrl) continue;

    // Converter imagem para base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);
    if (!imageBase64) continue;

    // Construir exemplo de treinamento
    const example: TrainingExample = {
      messages: [
        {
          role: 'system',
          content: getSystemPromptForExamType(examType)
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analise esta imagem de OCT e retorne os achados em formato JSON.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            // Usar dados validados pelo medico
            diagnosis: c.diagnosis_correct || c.ai_analysis?.diagnosis,
            findings: c.ai_analysis?.findings,
            biomarkers: c.ai_analysis?.biomarkers,
            measurements: c.ai_analysis?.measurements,
            recommendations: c.ai_analysis?.recommendations
          }, null, 2)
        }
      ]
    };

    trainingData.push(example);
  }

  return trainingData;
}

// Exportar como JSONL (formato requerido para fine-tuning)
function toJSONL(data: TrainingExample[]): string {
  return data.map(example => JSON.stringify(example)).join('\n');
}
```

#### 5.2 Script de Fine-Tuning (Google Vertex AI)

```python
# scripts/fine_tune_gemini.py
from google.cloud import aiplatform
from google.cloud.aiplatform import TuningJob
import json

def create_fine_tuning_job(
    project_id: str,
    location: str,
    training_data_uri: str,
    model_display_name: str
):
    """
    Criar job de fine-tuning no Vertex AI
    """
    aiplatform.init(project=project_id, location=location)

    # Configurar job de tuning
    tuning_job = TuningJob.create(
        source_model="gemini-1.5-pro",  # Modelo base
        training_data=training_data_uri,  # gs://bucket/training_data.jsonl
        tuned_model_display_name=model_display_name,
        epochs=3,
        learning_rate=0.0001,
        batch_size=4
    )

    print(f"Tuning job created: {tuning_job.resource_name}")

    # Aguardar conclusao
    tuning_job.wait()

    # Obter modelo tunado
    tuned_model = tuning_job.tuned_model
    print(f"Tuned model endpoint: {tuned_model.endpoint_resource_name}")

    return tuned_model


def deploy_tuned_model(tuned_model):
    """
    Fazer deploy do modelo tunado
    """
    endpoint = tuned_model.deploy(
        machine_type="n1-standard-4",
        min_replica_count=1,
        max_replica_count=3
    )

    return endpoint.resource_name
```

#### 5.3 Usar Modelo Fine-Tuned na Aplicacao

```typescript
// Modificar analyze-image para usar modelo tunado quando disponivel

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const TUNED_MODEL_ENDPOINT = Deno.env.get('TUNED_MODEL_ENDPOINT');

async function callAI(prompt: string, images: string[]): Promise<string> {
  // Verificar se modelo tunado esta disponivel
  if (TUNED_MODEL_ENDPOINT) {
    return callTunedModel(prompt, images);
  }

  // Fallback para modelo padrao
  return callGeminiAPI(prompt, images);
}

async function callTunedModel(prompt: string, images: string[]): Promise<string> {
  const response = await fetch(TUNED_MODEL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('VERTEX_AI_TOKEN')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{
        prompt,
        images
      }],
      parameters: {
        maxOutputTokens: 8000,
        temperature: 0.1
      }
    })
  });

  const result = await response.json();
  return result.predictions[0];
}
```

### Vantagens
- Modelo especializado para dominio
- Melhor precisao a longo prazo
- Menos tokens por request (sem exemplos)

### Desvantagens
- Custo alto de treinamento
- Requer dataset grande (100+ exemplos)
- Ciclo de atualizacao lento
- Complexidade operacional

---

## 6. Arquitetura Recomendada

### Estrategia Hibrida (Recomendada)

Combinar as abordagens para maximizar beneficios:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE HIBRIDO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Fase 1: IMEDIATO (Semana 1-2)                                 │
│   └── Prompt Engineering Dinamico                                │
│       • Ajustes baseados em feedback                            │
│       • Correcoes automaticas                                    │
│                                                                  │
│   Fase 2: CURTO PRAZO (Semana 3-6)                              │
│   └── Few-Shot Learning                                          │
│       • Casos de referencia no prompt                           │
│       • Exemplos validados por medicos                          │
│                                                                  │
│   Fase 3: MEDIO PRAZO (Mes 2-3)                                 │
│   └── RAG com pgvector                                           │
│       • Busca semantica de casos similares                      │
│       • Contexto visual relevante                               │
│                                                                  │
│   Fase 4: LONGO PRAZO (Mes 4+)                                  │
│   └── Fine-Tuning                                                │
│       • Modelo customizado                                       │
│       • Requer 200+ casos validados                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Metricas de Sucesso

| Metrica | Baseline | Meta Fase 1 | Meta Fase 4 |
|---------|----------|-------------|-------------|
| Taxa de Acerto | ~70% | 80% | 95% |
| Falsos Positivos | ~15% | 10% | 3% |
| Falsos Negativos | ~15% | 10% | 2% |
| Tempo de Analise | 30s | 30s | 15s |

---

## 7. Implementacao Passo a Passo

### Sprint 1: Prompt Engineering Dinamico

#### Tarefas
1. [ ] Criar tabela `prompt_configs`
2. [ ] Criar Edge Function `analyze-feedback`
3. [ ] Modificar `analyze-image` para carregar configs
4. [ ] Agendar execucao diaria do analyze-feedback
5. [ ] Dashboard para visualizar correcoes ativas

#### Estimativa: 3-5 dias

### Sprint 2: Few-Shot Learning

#### Tarefas
1. [ ] Criar view materializada `reference_cases_mv`
2. [ ] Funcao `getReferenceCases`
3. [ ] Modificar prompt para incluir exemplos
4. [ ] Testar com casos de diferentes patologias
5. [ ] Otimizar selecao de casos

#### Estimativa: 5-7 dias

### Sprint 3: RAG

#### Tarefas
1. [ ] Habilitar pgvector no Supabase
2. [ ] Criar tabela `image_embeddings`
3. [ ] Integrar servico de embedding (HuggingFace/OpenAI)
4. [ ] Implementar busca de similaridade
5. [ ] Pipeline completo de RAG

#### Estimativa: 10-14 dias

### Sprint 4: Fine-Tuning

#### Pre-requisitos
- [ ] Minimo 200 casos de referencia validados
- [ ] Conta Google Cloud com Vertex AI
- [ ] Budget aprovado (~$500-2000 por treino)

#### Tarefas
1. [ ] Script de exportacao de dataset
2. [ ] Validacao de qualidade do dataset
3. [ ] Configurar Vertex AI
4. [ ] Executar fine-tuning
5. [ ] Validar modelo tunado
6. [ ] Deploy e integracao

#### Estimativa: 3-4 semanas

---

## Apendice: Custos Estimados

| Componente | Custo Mensal Estimado |
|------------|----------------------|
| Prompt Engineering | $0 (sem custo adicional) |
| Few-Shot Learning | +$50-100 (mais tokens) |
| RAG + Embeddings | +$100-200 (API embeddings) |
| Fine-Tuning | $500-2000 (por treino) |
| Modelo Tunado | +$200-500 (hosting) |

---

*Documento tecnico - OphthExam AI Learning Pipeline*
