
# Plano: Timeout e Deteccao Automatica de Falha na Analise de IA

## Problema Identificado

Exames estao ficando travados no status "analyzing" porque:

1. O botao "Re-analisar" so aparece quando ja existe uma analise anterior
2. Quando a analise falha, nao ha feedback visual para o usuario
3. Nao existe timeout para detectar analises que nao completam
4. O tratamento de erro em NewAnalysis.tsx nao notifica o usuario adequadamente

---

## Solucao Proposta

### 1. Adicionar Timeout de 2 Minutos no ExamView.tsx

Quando o exame estiver em status "analyzing", iniciar um contador de 2 minutos (120 segundos). Se a analise nao completar nesse tempo:

- Reverter automaticamente o status para "pending"
- Mostrar mensagem de erro ao usuario
- Exibir botao para tentar novamente

```text
+------------------------------------------+
|  Card de Erro (bg-red-50)               |
|  [!] Tempo limite excedido              |
|  A analise nao foi concluida em 2min.   |
|  [Tentar Novamente] [Ver Logs]          |
+------------------------------------------+
```

### 2. Mostrar Botao Re-analisar para Exames sem Analise

Modificar a logica para exibir o botao quando:
- Status = "pending" ou "analyzing" (sem resultado apos timeout)
- Status != "approved"

Isso permite que o usuario tente novamente mesmo quando a analise inicial falhou completamente.

### 3. Melhorar Tratamento de Erro no NewAnalysis.tsx

Quando a Edge Function retornar erro:
- Mostrar toast com mensagem de erro especifica
- Manter o exame em "analyzing" brevemente e entao reverter
- Redirecionar para a pagina do exame onde o usuario pode ver o status e re-tentar

### 4. Card de Status Melhorado no ExamView

Estados visuais claros:

| Estado | Visual |
|--------|--------|
| Analisando (< 2min) | Spinner azul + "Processando..." |
| Analisando (> 1min) | Spinner + "Analise demorando mais que o normal..." |
| Timeout (> 2min) | Card vermelho + "Tempo esgotado" + botao Re-analisar |
| Erro conhecido | Card vermelho + mensagem especifica + botao Re-analisar |
| Sem analise | Card amarelo + "Aguardando analise" + botao Iniciar |

---

## Implementacao Tecnica

### Arquivo: src/pages/ExamView.tsx

**Novos Estados:**
```typescript
const [analysisStartTime, setAnalysisStartTime] = useState<Date | null>(null);
const [analysisTimeout, setAnalysisTimeout] = useState(false);
const [analysisError, setAnalysisError] = useState<string | null>(null);
```

**Logica de Timeout:**
```typescript
useEffect(() => {
  if (exam?.status !== "analyzing") {
    setAnalysisStartTime(null);
    setAnalysisTimeout(false);
    return;
  }

  // Iniciar ou usar created_at do exame
  if (!analysisStartTime) {
    setAnalysisStartTime(new Date(exam.updated_at || exam.created_at));
  }

  const checkTimeout = setInterval(() => {
    const elapsed = Date.now() - (analysisStartTime?.getTime() || Date.now());
    if (elapsed > 120000) { // 2 minutos
      setAnalysisTimeout(true);
      // Reverter status para pending
      supabase.from("exams")
        .update({ status: "pending" })
        .eq("id", exam.id);
    }
  }, 5000);

  return () => clearInterval(checkTimeout);
}, [exam?.status, analysisStartTime, exam?.id]);
```

**Novo Card de Erro/Timeout:**

Substituir o card de "Aguardando conclusao..." por uma logica condicional:

1. Se `analysisTimeout = true`: Card vermelho com mensagem de timeout
2. Se `analysisError`: Card vermelho com mensagem de erro
3. Se `status = analyzing` e tempo < 2min: Card azul com spinner
4. Se `status = pending` ou `analyzed` sem analise: Card amarelo pedindo re-analise

**Botao Re-analisar Sempre Visivel:**

Modificar a condicao da linha 594:
```typescript
// ANTES
{exam.status !== "approved" && exam.analysis && (

// DEPOIS
{exam.status !== "approved" && (
```

### Arquivo: src/pages/NewAnalysis.tsx

**Melhorar Tratamento de Erro (linha 211-218):**
```typescript
const { data: analysisResult, error: analysisError } = 
  await supabase.functions.invoke("analyze-image", {
    body: { exam_id: examData.id },
  });

if (analysisError) {
  console.error("Analysis error:", analysisError);
  toast({
    title: "Erro na analise de IA",
    description: "A analise sera tentada novamente. Verifique na pagina do exame.",
    variant: "destructive",
  });
}
```

### Arquivo: supabase/functions/analyze-image/index.ts

A Edge Function ja tem tratamento de erro adequado e reverte o status para "pending" em caso de falha. Nenhuma alteracao necessaria.

---

## Fluxo de Usuario Atualizado

```text
1. Usuario cria exame
   |
   v
2. Status = "analyzing"
   |
   +---> Sucesso em < 2min --> Status = "analyzed" --> Mostra resultado
   |
   +---> Erro --> Edge Function reverte para "pending"
   |              --> ExamView mostra "Falha na analise" + botao Re-analisar
   |
   +---> Timeout (2min) --> ExamView reverte para "pending"
                            --> Mostra "Tempo esgotado" + botao Re-analisar

3. Usuario clica "Re-analisar"
   |
   v
4. Status volta para "analyzing" --> Tenta novamente
```

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/pages/ExamView.tsx` | Adicionar logica de timeout, melhorar cards de status, exibir botao re-analisar sempre |
| `src/pages/NewAnalysis.tsx` | Melhorar feedback de erro ao usuario |

---

## Beneficios

1. **Usuarios nunca ficam travados**: Sempre havera uma opcao de acao
2. **Feedback claro**: Mensagens especificas sobre o que aconteceu
3. **Recuperacao automatica**: Sistema reverte status automaticamente
4. **Experiencia consistente**: Estados visuais claros para cada situacao

---

## Consideracoes Adicionais

### Banco de Dados (Opcional - Melhoria Futura)

Adicionar campo `analysis_started_at` na tabela exams para tracking mais preciso:

```sql
ALTER TABLE exams ADD COLUMN analysis_started_at TIMESTAMPTZ;
```

Isso permitiria:
- Tracking preciso do tempo de analise
- Relatorios de performance da IA
- Alertas automaticos para analises lentas

### Monitoramento (Opcional)

Criar funcao de limpeza para exames antigos travados em "analyzing":

```sql
-- Executar periodicamente
UPDATE exams 
SET status = 'pending' 
WHERE status = 'analyzing' 
AND updated_at < NOW() - INTERVAL '5 minutes';
```

Isso garante que mesmo exames abandonados sejam corrigidos automaticamente.
