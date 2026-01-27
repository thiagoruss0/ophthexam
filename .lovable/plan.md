

# Plano: Corrigir Busca de Análise Mais Recente

## Problema Identificado

Existem **múltiplas análises** para o mesmo exame no banco de dados (3 no caso atual):

1. `0fde75d3...` - análise antiga, **sem flag bilateral**
2. `72f4dd68...` - análise nova, **com bilateral: true**  
3. `4b2067e0...` - análise nova, **com bilateral: true**

O código em `ExamView.tsx` linha 142 pega o **primeiro elemento do array** sem ordenação:

```typescript
analysis: (data.ai_analysis as any[])?.[0],
```

O Supabase não garante ordem específica quando não há `ORDER BY`, então pode retornar a análise mais antiga (sem bilateral), causando a exibição incorreta.

---

## Solução

### 1. Modificar a Query para Ordenar por Data

Atualizar a query em `fetchExamData()` para ordenar as análises pela data de criação mais recente:

**Arquivo:** `src/pages/ExamView.tsx`

```typescript
// Antes (linha 113):
ai_analysis (...)

// Depois:
ai_analysis!inner (...)
// E usar order ou filtrar apenas a última
```

**Problema:** O Supabase não permite `ORDER BY` dentro de sub-relacionamentos na mesma query.

### 2. Solução Alternativa: Query Separada

Buscar a análise mais recente em uma query separada:

```typescript
// Após buscar o exame:
const { data: analysisData } = await supabase
  .from('ai_analysis')
  .select('*')
  .eq('exam_id', id)
  .order('id', { ascending: false }) // UUIDs v4 não são ordenados, usar created_at se disponível
  .limit(1)
  .single();
```

**Nota:** Se a tabela `ai_analysis` não tem `created_at`, podemos:
- A. Usar a ordem de inserção via ID (menos confiável)
- B. Adicionar coluna `created_at` (ideal)

### 3. Verificar se `ai_analysis` tem `created_at`

Se não tiver, adicionar via migração.

---

## Implementação Recomendada

### Passo 1: Adicionar `created_at` à tabela `ai_analysis` (se não existir)

```sql
ALTER TABLE public.ai_analysis 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
```

### Passo 2: Modificar `fetchExamData()` em `ExamView.tsx`

```typescript
// Buscar análise mais recente separadamente
const { data: latestAnalysis } = await supabase
  .from('ai_analysis')
  .select(`
    id,
    quality_score,
    findings,
    biomarkers,
    measurements,
    diagnosis,
    recommendations,
    risk_classification
  `)
  .eq('exam_id', id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// Usar esta análise em vez de [0] do array
```

### Passo 3: Limpar Análises Antigas ao Re-analisar

Modificar `handleReanalyze()` para deletar **todas** as análises anteriores:

```typescript
// Antes:
if (exam.analysis?.id) {
  await supabase.from("ai_analysis").delete().eq("id", exam.analysis.id);
}

// Depois:
await supabase.from("ai_analysis").delete().eq("exam_id", exam.id);
```

Isso garante que não fiquem análises órfãs.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| Migração SQL | Adicionar `created_at` se não existir |
| `src/pages/ExamView.tsx` | Buscar análise mais recente, limpar todas ao re-analisar |

---

## Fluxo Corrigido

```text
1. Exame tem múltiplas análises
   |
   v
2. Query ordena por created_at DESC
   |
   v
3. Pega análise mais recente (com bilateral)
   |
   v
4. Exibe corretamente OD e OE separados
```

---

## Benefícios

1. **Sempre usa análise mais recente:** Nunca pega análise antiga
2. **Limpa análises órfãs:** Re-análise remove todas as anteriores
3. **Auditoria:** `created_at` permite rastrear quando cada análise foi criada
4. **Performance:** Query simples com `LIMIT 1`

---

## Considerações

- A adição de `created_at` não afeta análises existentes (terão valor `now()` após migração)
- Análises existentes podem ser limpas manualmente se desejado
- A mudança é retrocompatível

