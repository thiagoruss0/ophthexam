

# Plano: Separacao de Achados por Olho (OD/OE) no Relatorio

## Problema Identificado

Quando um exame e marcado como `eye: both` (ambos os olhos), o relatorio final exibe os achados como se fossem de um unico olho. O formato correto para laudo deve:

1. Mostrar **OLHO DIREITO** e **OLHO ESQUERDO** em secoes separadas
2. Sempre exibir a **Espessura Foveal Central** de cada olho
3. Seguir o padrao clinico de relatorios oftalmologicos

---

## Arquitetura da Solucao

A solucao envolve modificacoes em dois niveis:

### Nivel 1: Frontend (Exibicao)
- Modificar os componentes de display para renderizar cada olho separadamente quando `eye === "both"`
- Criar estrutura visual clara com cabecalhos "OLHO DIREITO" e "OLHO ESQUERDO"

### Nivel 2: Backend (Analise de IA)
- Modificar o prompt da IA para retornar dados estruturados por olho
- Atualizar o mapeamento de resposta para preservar a estrutura bilateral

---

## Implementacao Detalhada

### 1. Modificar Prompt da IA (Edge Function)

Atualizar o prompt OCT_MACULAR_PROMPT para solicitar analise bilateral:

**Estrutura de Resposta Atualizada:**
```json
{
  "bilateral": true,
  "od": {
    "quality": {...},
    "layers": {...},
    "biomarkers": {...},
    "measurements": {
      "central_foveal_thickness": {"value": 198, "unit": "um", "classification": "normal"}
    }
  },
  "oe": {
    "quality": {...},
    "layers": {...},
    "biomarkers": {...},
    "measurements": {
      "central_foveal_thickness": {"value": 192, "unit": "um", "classification": "normal"}
    }
  },
  "comparison": {
    "symmetry": "simetrico|assimetrico",
    "notes": "Achados bilaterais e simetricos..."
  },
  "diagnosis": [...],
  "recommendations": [...]
}
```

### 2. Atualizar Mapeamento no Edge Function

**Arquivo:** `supabase/functions/analyze-image/index.ts`

Modificar a funcao `mapResponseToAnalysis` para:
- Detectar se a resposta e bilateral
- Preservar a estrutura `od` e `oe` no campo `findings`
- Extrair medidas de cada olho para o campo `measurements`

### 3. Atualizar Estrutura do Banco de Dados

O campo `findings` (JSONB) ja suporta estrutura aninhada. A nova estrutura sera:

```json
{
  "bilateral": true,
  "od": {
    "layers": {...},
    "clinical_notes": "..."
  },
  "oe": {
    "layers": {...},
    "clinical_notes": "..."
  },
  "comparison_notes": "..."
}
```

O campo `measurements` sera atualizado para:
```json
{
  "od": {
    "central_foveal_thickness": {"value": 198, "unit": "um", "classification": "normal"}
  },
  "oe": {
    "central_foveal_thickness": {"value": 192, "unit": "um", "classification": "normal"}
  }
}
```

### 4. Criar Componente BilateralDisplay

**Novo Arquivo:** `src/components/exam/BilateralDisplay.tsx`

Componente wrapper que:
- Detecta se a analise e bilateral (`findings.bilateral === true`)
- Renderiza duas colunas ou secoes para OD e OE
- Exibe comparacao entre os olhos

```text
+--------------------------------------------------+
| TOMOGRAFIA DE COERENCIA OPTICA - MACULAR         |
| Qualidade Global: Boa                            |
+--------------------------------------------------+

+------------------------+   +------------------------+
| OLHO DIREITO (OD)      |   | OLHO ESQUERDO (OE)     |
+------------------------+   +------------------------+
| Interface Vitreorret.  |   | Interface Vitreorret.  |
| [Normal]               |   | [Normal]               |
|------------------------|   |------------------------|
| Camadas Internas       |   | Camadas Internas       |
| [Normal]               |   | [Normal]               |
|------------------------|   |------------------------|
| Camadas Externas       |   | Camadas Externas       |
| [Normal]               |   | [Normal]               |
|------------------------|   |------------------------|
| Complexo EPR           |   | Complexo EPR           |
| [Normal]               |   | [Normal]               |
|------------------------|   |------------------------|
| ESPESSURA FOVEAL       |   | ESPESSURA FOVEAL       |
| 198 um [Normal]        |   | 192 um [Normal]        |
+------------------------+   +------------------------+

+--------------------------------------------------+
| COMPARACAO BILATERAL                             |
| Achados bilaterais e simetricos.                 |
+--------------------------------------------------+

| IMPRESSAO DIAGNOSTICA                            |
| - Membrana Epirretiniana Leve (bilateral)        |
+--------------------------------------------------+

| RECOMENDACOES                                    |
| - Monitoramento com OCT seriado                  |
+--------------------------------------------------+
```

### 5. Atualizar OctMacularDisplay

**Arquivo:** `src/components/exam/OctMacularDisplay.tsx`

Modificar para:
1. Detectar se `findings.bilateral === true`
2. Se bilateral: renderizar `BilateralDisplay`
3. Se unilateral: manter comportamento atual

```typescript
export function OctMacularDisplay({ analysis, eye }: OctMacularDisplayProps) {
  const findings = analysis.findings || {};
  
  // Check if bilateral analysis
  if (findings.bilateral && findings.od && findings.oe) {
    return (
      <BilateralOctMacularDisplay 
        analysis={analysis} 
        odFindings={findings.od}
        oeFindings={findings.oe}
        comparison={findings.comparison_notes}
      />
    );
  }
  
  // Single eye display (current behavior)
  return <SingleEyeOctMacularDisplay analysis={analysis} eye={eye} />;
}
```

### 6. Atualizar MeasurementsTable

**Arquivo:** `src/components/exam/MeasurementsTable.tsx`

Adicionar suporte para medidas bilaterais:

```typescript
// Nova prop para indicar o olho
interface MeasurementsTableProps {
  measurements: Record<string, any> | null;
  compact?: boolean;
  eye?: 'od' | 'oe' | 'both';
}

// Se measurements tem estrutura bilateral
if (measurements.od && measurements.oe) {
  return <BilateralMeasurementsTable od={measurements.od} oe={measurements.oe} />;
}
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/functions/analyze-image/index.ts` | Atualizar prompt para analise bilateral, modificar mapeamento |
| `src/components/exam/OctMacularDisplay.tsx` | Detectar e delegar para display bilateral |
| `src/components/exam/MeasurementsTable.tsx` | Suportar medidas por olho |
| `src/components/exam/OctNerveDisplay.tsx` | Mesma logica bilateral |
| `src/components/exam/RetinographyDisplay.tsx` | Mesma logica bilateral |
| `src/components/exam/AnalysisDisplay.tsx` | Passar informacoes de ambos os olhos |

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/exam/BilateralOctMacularDisplay.tsx` | Display bilateral para OCT Macular |
| `src/components/exam/SingleEyeDisplay.tsx` | Componente reutilizavel para um olho |
| `src/components/exam/BilateralMeasurementsTable.tsx` | Tabela comparativa OD/OE |
| `src/components/exam/ComparisonSection.tsx` | Secao de comparacao bilateral |

---

## Fluxo de Dados Atualizado

```text
1. Upload de Imagem (exam.eye = "both")
   |
   v
2. Edge Function detect eye="both"
   |
   v
3. Prompt inclui instrucao para analise bilateral
   |
   v
4. IA retorna JSON com estrutura {od: {...}, oe: {...}}
   |
   v
5. Mapeamento salva em findings: {bilateral: true, od: {...}, oe: {...}}
   |
   v
6. Frontend detecta findings.bilateral === true
   |
   v
7. BilateralDisplay renderiza OD e OE lado a lado
   |
   v
8. Cada olho mostra sua Espessura Foveal Central
```

---

## Regras de Negocio

1. **Espessura Foveal Central**: SEMPRE deve ser exibida para cada olho
2. **Quando `eye === "both"`**: Mostrar secoes separadas para OD e OE
3. **Quando `eye === "od"` ou `eye === "oe"`**: Manter display atual de um unico olho
4. **Comparacao**: Incluir secao de comparacao entre os olhos quando bilateral
5. **Simetria**: Indicar visualmente se achados sao simetricos ou assimetricos

---

## Beneficios

1. **Clareza Clinica**: Relatorio segue padrao de laudo oftalmologico
2. **Espessura por Olho**: Medida mais importante sempre visivel
3. **Comparacao Visual**: Facilita identificar assimetrias
4. **Retrocompatibilidade**: Exames existentes continuam funcionando
5. **PDF Consistente**: Mesma estrutura sera usada no PDF

---

## Consideracoes Tecnicas

- O campo `findings` (JSONB) suporta qualquer estrutura aninhada
- Exames ja analisados com estrutura antiga continuarao funcionando
- A deteccao de bilateral e feita pelo campo `findings.bilateral`
- O prompt da IA sera atualizado para gerar a nova estrutura automaticamente
- Analises antigas sem estrutura bilateral mostrarao no display antigo (single eye)

