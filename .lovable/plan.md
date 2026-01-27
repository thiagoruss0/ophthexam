
# Plano: Sistema de Treinamento da IA de Laudos

## Visao Geral

Implementar sistema completo de feedback medico para melhorar continuamente a IA de analise de exames oftalmologicos, incluindo coleta estruturada de avaliacoes, metricas de performance e exportacao de dados para treinamento.

---

## 1. CRIAR TABELA ai_feedback NO BANCO DE DADOS

### SQL Migration

```sql
-- Tabela de feedback do medico sobre a analise da IA
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  ai_analysis_id UUID REFERENCES ai_analysis(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Avaliacoes principais
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  accuracy_rating TEXT CHECK (accuracy_rating IN ('correct', 'partially_correct', 'incorrect')),
  
  -- Feedback de qualidade da imagem
  quality_feedback TEXT CHECK (quality_feedback IN ('agree', 'disagree')),
  quality_correct TEXT,
  
  -- Feedback de diagnosticos
  diagnosis_feedback TEXT CHECK (diagnosis_feedback IN ('agree', 'partially_agree', 'disagree')),
  diagnosis_added TEXT[],
  diagnosis_removed TEXT[],
  diagnosis_correct TEXT[],
  
  -- Feedback detalhado (JSONB para flexibilidade)
  biomarkers_feedback JSONB,
  measurements_feedback JSONB,
  
  -- Comentarios
  general_comments TEXT,
  teaching_notes TEXT,
  
  -- Metadados para treinamento
  is_reference_case BOOLEAN DEFAULT FALSE,
  case_difficulty TEXT CHECK (case_difficulty IN ('easy', 'moderate', 'difficult', 'rare')),
  pathology_tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX idx_ai_feedback_exam ON ai_feedback(exam_id);
CREATE INDEX idx_ai_feedback_doctor ON ai_feedback(doctor_id);
CREATE INDEX idx_ai_feedback_rating ON ai_feedback(overall_rating);
CREATE INDEX idx_ai_feedback_reference ON ai_feedback(is_reference_case) WHERE is_reference_case = true;

-- Habilitar RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Policies usando funcoes SECURITY DEFINER existentes
CREATE POLICY "Doctors can insert own feedback" ON ai_feedback
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Doctors can view own feedback" ON ai_feedback
  FOR SELECT TO authenticated
  USING (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Doctors can update own feedback" ON ai_feedback
  FOR UPDATE TO authenticated
  USING (doctor_id = get_profile_id(auth.uid()));

CREATE POLICY "Admins can view all feedback" ON ai_feedback
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_feedback_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Apos executar, regenerar tipos TypeScript automaticamente

---

## 2. CRIAR COMPONENTE AiFeedbackForm

### Arquivo: `src/components/exam/AiFeedbackForm.tsx`

### Props da Interface

```typescript
interface AiFeedbackFormProps {
  examId: string;
  analysisId?: string;
  analysis?: {
    quality_score?: string;
    diagnosis?: string[];
    biomarkers?: any;
    measurements?: any;
  };
  doctorId: string;
  onSubmit: () => void;
  onSkip: () => void;
}
```

### Campos do Formulario

| Campo | Tipo | Descricao |
|-------|------|-----------|
| Rating Geral | 5 estrelas clicaveis | Avaliacao de 1-5 estrelas |
| Precisao | Radio buttons | Correta / Parcialmente Correta / Incorreta |
| Qualidade | Toggle + texto | Concordo/Discordo + correcao se discordou |
| Diagnosticos | Checkboxes + input | Lista da IA com confirmacao + campo para adicionar faltantes |
| Caso Referencia | Toggle | Marcar como caso de treinamento |
| Dificuldade | Select | Facil / Moderado / Dificil / Raro |
| Tags | Input com chips | Patologias identificadas (removiveis) |
| Comentarios | Textarea | Observacoes gerais |
| Notas Ensino | Textarea | Opcional, para casos didaticos |

### Estados do Componente

```typescript
const [rating, setRating] = useState<number>(0);
const [accuracy, setAccuracy] = useState<string>("");
const [qualityAgree, setQualityAgree] = useState<boolean | null>(null);
const [qualityCorrect, setQualityCorrect] = useState("");
const [diagnosisFeedback, setDiagnosisFeedback] = useState<string>("");
const [confirmedDiagnoses, setConfirmedDiagnoses] = useState<string[]>([]);
const [addedDiagnoses, setAddedDiagnoses] = useState<string[]>([]);
const [isReferenceCase, setIsReferenceCase] = useState(false);
const [difficulty, setDifficulty] = useState("");
const [pathologyTags, setPathologyTags] = useState<string[]>([]);
const [comments, setComments] = useState("");
const [teachingNotes, setTeachingNotes] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

### UI Components Utilizados

- Star rating customizado com icone Star do lucide-react
- RadioGroup para precisao
- Switch para concordancia de qualidade
- Checkbox para cada diagnostico da IA
- Input com botao + para adicionar diagnosticos
- Select para dificuldade
- Input com Badge removivel para tags
- Textarea para comentarios
- Button primary "Enviar Feedback" e ghost "Pular"

---

## 3. INTEGRAR NO ExamView.tsx

### Modificacoes Necessarias

**Novos Estados:**
```typescript
const [hasFeedback, setHasFeedback] = useState<boolean | null>(null);
const [showFeedbackForm, setShowFeedbackForm] = useState(false);
```

**Nova Query no fetchExamData:**
```typescript
// Verificar se ja existe feedback
const { data: feedback } = await supabase
  .from("ai_feedback")
  .select("id")
  .eq("exam_id", id)
  .eq("doctor_id", profile?.id)
  .single();

setHasFeedback(!!feedback);
```

**Novo Card apos botoes de Exportar/Compartilhar (linha ~771):**

Condicao: `exam.status === "approved"`

Se `hasFeedback === false`:
- Card com fundo amarelo claro (bg-yellow-50 border-yellow-200)
- Icone Star amarelo
- Titulo: "Avalie a Analise da IA"
- Texto: "Seu feedback ajuda a melhorar as analises futuras"
- Botao "Avaliar Analise" que seta showFeedbackForm = true
- Botao "Pular" que seta hasFeedback = true (esconde o card)

Se `showFeedbackForm`:
- Renderiza `<AiFeedbackForm />` com props apropriadas
- onSubmit: atualiza hasFeedback = true e showFeedbackForm = false
- onSkip: apenas fecha o form

Se `hasFeedback === true`:
- Badge verde "Feedback registrado" com icone CheckCircle

---

## 4. CRIAR PAGINA DE METRICAS (ADMIN)

### Arquivo: `src/pages/AiMetrics.tsx`

### Estrutura da Pagina

```
+--------------------------------------------------+
|  DashboardHeader                                 |
+--------------------------------------------------+
|  h1: Metricas de Performance da IA              |
|  Botao: Exportar Dados para Treinamento         |
+--------------------------------------------------+
|  CARDS DE RESUMO (grid 4 colunas)               |
|  [Total Analises] [Total Feedbacks] [Rating]    |
|  [Taxa Acerto]                                   |
+--------------------------------------------------+
|  GRAFICOS (grid 2 colunas)                      |
|  [LineChart: Rating por Semana]                 |
|  [PieChart: Distribuicao Precisao]              |
|  [BarChart: Performance por Tipo - full width]  |
+--------------------------------------------------+
|  TABELA: Casos de Referencia                    |
|  Tipo | Dificuldade | Tags | Rating | Data | Ver|
+--------------------------------------------------+
```

### Queries Necessarias

**Stats Cards:**
```typescript
// Total de analises
const { count: totalAnalyses } = await supabase
  .from("ai_analysis")
  .select("*", { count: "exact", head: true });

// Total de feedbacks
const { count: totalFeedbacks } = await supabase
  .from("ai_feedback")
  .select("*", { count: "exact", head: true });

// Rating medio
const { data: ratings } = await supabase
  .from("ai_feedback")
  .select("overall_rating");
const avgRating = ratings?.reduce((a, b) => a + (b.overall_rating || 0), 0) / (ratings?.length || 1);

// Taxa de acerto
const { data: accuracy } = await supabase
  .from("ai_feedback")
  .select("accuracy_rating");
const correctRate = (accuracy?.filter(a => a.accuracy_rating === "correct").length || 0) / (accuracy?.length || 1) * 100;
```

**Graficos com Recharts (ja instalado):**

1. LineChart - Rating por Semana (ultimos 3 meses)
2. PieChart - Distribuicao: Correto / Parcial / Incorreto
3. BarChart - Performance por tipo de exame (oct_macular, oct_nerve, retinography)

**Casos de Referencia:**
```typescript
const { data: referenceCases } = await supabase
  .from("ai_feedback")
  .select(`
    id,
    overall_rating,
    case_difficulty,
    pathology_tags,
    created_at,
    exams (id, exam_type, exam_date)
  `)
  .eq("is_reference_case", true)
  .order("created_at", { ascending: false });
```

**Exportar Dados para Treinamento:**
```typescript
const handleExportTrainingData = async () => {
  const { data } = await supabase
    .from("ai_feedback")
    .select(`
      exam_id,
      diagnosis_correct,
      pathology_tags,
      case_difficulty,
      exams (exam_type, exam_images (image_url))
    `)
    .gte("overall_rating", 4);

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  // Trigger download
};
```

---

## 5. ADICIONAR ROTAS E LINKS

### App.tsx - Nova Rota

```tsx
import AiMetricsPage from "./pages/AiMetrics";

// Dentro de Routes, apos outras rotas admin:
<Route
  path="/admin/ai-metrics"
  element={
    <ProtectedRoute requireAdmin>
      <AiMetricsPage />
    </ProtectedRoute>
  }
/>
```

### Admin.tsx - Link para Metricas

Adicionar na tab de navegacao ou como card separado:

```tsx
import { Brain } from "lucide-react";
import { Link } from "react-router-dom";

// Apos os stats cards:
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Brain className="h-5 w-5" />
      Metricas da IA
    </CardTitle>
    <CardDescription>
      Acompanhe a performance e exporte dados para treinamento
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Link to="/admin/ai-metrics">
      <Button className="w-full">
        Ver Metricas
      </Button>
    </Link>
  </CardContent>
</Card>
```

---

## 6. LEMBRETE NO DASHBOARD

### Dashboard.tsx - Novo Card de Lembrete

**Nova Query:**
```typescript
const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

// Dentro de fetchDashboardData:
// Contar exames aprovados sem feedback
const { count } = await supabase
  .from("exams")
  .select("id", { count: "exact", head: true })
  .eq("doctor_id", profile?.id)
  .eq("status", "approved")
  .not("id", "in", `(SELECT exam_id FROM ai_feedback WHERE doctor_id = '${profile?.id}')`);
// Nota: Esta query pode precisar ser uma RPC function para melhor performance
```

**Alternativa mais simples (duas queries):**
```typescript
// Buscar IDs de exames aprovados
const { data: approvedExams } = await supabase
  .from("exams")
  .select("id")
  .eq("doctor_id", profile?.id)
  .eq("status", "approved");

// Buscar IDs de exames com feedback
const { data: feedbackExams } = await supabase
  .from("ai_feedback")
  .select("exam_id")
  .eq("doctor_id", profile?.id);

const feedbackExamIds = new Set(feedbackExams?.map(f => f.exam_id));
const pendingCount = approvedExams?.filter(e => !feedbackExamIds.has(e.id)).length || 0;
setPendingFeedbackCount(pendingCount);
```

**Novo Card (antes ou depois do card de Exames Recentes):**

Condicao: `pendingFeedbackCount > 0`

```tsx
<Card className="bg-yellow-50 border-yellow-200 mb-6">
  <CardContent className="py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Star className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="font-medium text-yellow-900">
            {pendingFeedbackCount} exame(s) aguardando avaliacao da IA
          </p>
          <p className="text-sm text-yellow-700">
            Seu feedback ajuda a melhorar as analises futuras
          </p>
        </div>
      </div>
      <Link to="/historico?status=approved">
        <Button size="sm" variant="outline" className="border-yellow-400">
          Avaliar
        </Button>
      </Link>
    </div>
  </CardContent>
</Card>
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/exam/AiFeedbackForm.tsx` | Formulario de feedback estruturado |
| `src/pages/AiMetrics.tsx` | Pagina de metricas para admin |

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| Database (SQL) | Criar tabela ai_feedback com RLS |
| `src/integrations/supabase/types.ts` | Regenerar automaticamente |
| `src/pages/ExamView.tsx` | Adicionar card de feedback apos aprovacao |
| `src/pages/Admin.tsx` | Adicionar link para Metricas da IA |
| `src/pages/Dashboard.tsx` | Adicionar card de lembrete de feedback |
| `src/App.tsx` | Adicionar rota /admin/ai-metrics |

---

## Sugestoes de Melhoria

### 1. Funcao RPC para contagem eficiente
Criar funcao no banco para contar exames sem feedback de forma mais eficiente:

```sql
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
```

### 2. Constraint UNIQUE para evitar duplicatas
```sql
ALTER TABLE ai_feedback ADD CONSTRAINT unique_feedback_per_exam_doctor 
  UNIQUE (exam_id, doctor_id);
```

### 3. Adicionar campo exam_type na tabela ai_feedback
Para facilitar queries de metricas por tipo de exame:
```sql
exam_type TEXT CHECK (exam_type IN ('oct_macular', 'oct_nerve', 'retinography'))
```

### 4. Gamificacao futura
Campos preparatorios para gamificacao do feedback:
- feedback_streak (dias consecutivos)
- total_feedbacks_given
- achievement_badges

---

## Ordem de Implementacao

1. Executar SQL no Supabase (criar tabela ai_feedback)
2. Regenerar types.ts (automatico apos migration)
3. Criar AiFeedbackForm.tsx
4. Atualizar ExamView.tsx (card + form)
5. Criar AiMetrics.tsx
6. Atualizar App.tsx (rota)
7. Atualizar Admin.tsx (link)
8. Atualizar Dashboard.tsx (lembrete)

---

## Consideracoes Tecnicas

### Seguranca
- RLS policies usando funcoes SECURITY DEFINER existentes (get_profile_id, is_admin)
- Constraint UNIQUE para evitar feedback duplicado
- Validacao de dados no frontend e backend

### Performance
- Indices em colunas frequentemente consultadas
- Query otimizada para contagem de feedbacks pendentes
- Paginacao na tabela de casos de referencia

### UX
- Formulario nao obrigatorio (botao "Pular")
- Feedback visual apos submissao (Badge verde)
- Lembrete sutil no Dashboard sem ser intrusivo

