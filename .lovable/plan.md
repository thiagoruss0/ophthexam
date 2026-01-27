
# Plano: Formatacao de Achados para Laudo Medico

## Problema Identificado

Os achados da analise de IA estao sendo exibidos como JSON bruto no frontend:

```javascript
<pre className="text-xs bg-muted p-2 rounded overflow-auto">
  {JSON.stringify(exam.analysis.findings, null, 2)}
</pre>
```

Isso nao e legivel para um laudo medico. Os dados estao estruturados corretamente no banco (layers, biomarkers, measurements, etc), mas nao estao sendo interpretados e formatados adequadamente.

---

## Solucao Proposta

Criar componentes especializados de formatacao para cada tipo de exame que transformam o JSON estruturado em texto clinico legivel, seguindo o padrao de laudo medico.

### Formato Esperado (Exemplo para OCT Macular):

```text
TOMOGRAFIA DE COERENCIA OPTICA (OCT) - MACULAR

Qualidade da Imagem: Boa

OLHO DIREITO / OLHO ESQUERDO

Interface Vitreorretiniana
- MLI: Presenca de linha hiperreflectiva aderida a superficie, 
  compativel com membrana epirretiniana

Camadas Retinianas Internas
- CFNR: Espessura e refletividade normais
- CCG: Espessura e refletividade normais
- CPI: Espessura e refletividade normais
- CNI: Espessura e refletividade normais

Camadas Retinianas Externas
- CPE: Espessura e refletividade normais
- CNE: Espessura e refletividade normais
- Zona Elipsoide: Linha continua e bem definida

Complexo EPR-Coriocapilar
- EPR: Complexo EPR/Membrana de Bruch integro
- Membrana de Bruch: Continua e sem interrupcoes

Coroide
- Espessura aparentemente normal

MEDIDAS
- Espessura Central Foveal: 192 um (normal)

BIOMARCADORES
[badges coloridas indicando presenca/ausencia]

NOTAS CLINICAS
[texto livre do ai_analysis.findings.clinical_notes]
```

---

## Arquitetura de Componentes

### 1. Componente Principal: AnalysisDisplay

```text
src/components/exam/
├── AnalysisDisplay.tsx         <- Componente principal (switch por tipo)
├── OctMacularDisplay.tsx       <- Formatacao OCT Macular
├── OctNerveDisplay.tsx         <- Formatacao OCT Nervo Optico
├── RetinographyDisplay.tsx     <- Formatacao Retinografia
├── BiomarkersDisplay.tsx       <- Badges de biomarcadores
├── MeasurementsTable.tsx       <- Tabela de medidas
└── LayersDisplay.tsx           <- Display de camadas retinianas
```

### 2. Mapeamento de Labels em Portugues

Criar dicionario para traduzir as keys do JSON para termos medicos:

```typescript
const layerLabels = {
  mli: "Membrana Limitante Interna (MLI)",
  cfnr: "Camada de Fibras Nervosas da Retina (CFNR)",
  ccg: "Camada de Celulas Ganglionares (CCG)",
  cpi: "Camada Plexiforme Interna (CPI)",
  cni: "Camada Nuclear Interna (CNI)",
  cpe: "Camada Plexiforme Externa (CPE)",
  cne: "Camada Nuclear Externa (CNE)",
  zona_elipsoide: "Zona Elipsoide (Linha IS/OS)",
  epr: "Epitelio Pigmentado da Retina (EPR)",
  membrana_bruch: "Membrana de Bruch",
  coroide: "Coroide",
};

const biomarkerLabels = {
  fluido_intraretiniano: "Fluido Intraretiniano",
  fluido_subretiniano: "Fluido Subretiniano",
  dep: "Descolamento do EPR",
  drusas: "Drusas",
  membrana_epirretiniana: "Membrana Epirretiniana",
  edema_macular: "Edema Macular",
  // ...
};
```

---

## Implementacao Detalhada

### Arquivo: src/components/exam/AnalysisDisplay.tsx

Componente que recebe o `exam_type` e os dados da analise, e renderiza o display apropriado:

```typescript
interface AnalysisDisplayProps {
  examType: string;
  analysis: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  eye: string;
}

export function AnalysisDisplay({ examType, analysis, eye }: AnalysisDisplayProps) {
  switch (examType) {
    case 'oct_macular':
      return <OctMacularDisplay analysis={analysis} eye={eye} />;
    case 'oct_nerve':
      return <OctNerveDisplay analysis={analysis} eye={eye} />;
    case 'retinography':
      return <RetinographyDisplay analysis={analysis} eye={eye} />;
    default:
      return <GenericDisplay analysis={analysis} />;
  }
}
```

### Arquivo: src/components/exam/OctMacularDisplay.tsx

Display formatado para OCT Macular com secoes claras:

**Secoes:**
1. Qualidade da Imagem (badge colorida)
2. Interface Vitreorretiniana
3. Camadas Retinianas Internas (CFNR, CCG, CPI, CNI)
4. Camadas Retinianas Externas (CPE, CNE, Zona Elipsoide)
5. Complexo EPR-Coriocapilar
6. Coroide
7. Medidas (tabela)
8. Biomarcadores Identificados (badges)
9. Notas Clinicas

**Logica de cores para status:**
- `normal` = verde (✓)
- `alterada/alterado` = vermelho (!)
- `ausente` = amarelo (⚠)

### Arquivo: src/components/exam/BiomarkersDisplay.tsx

Exibicao de biomarcadores como badges coloridas:

```typescript
interface BiomarkerBadgeProps {
  name: string;
  data: {
    present: boolean;
    severity?: string;
    location?: string;
    type?: string;
  };
}

// Badge verde = ausente/normal
// Badge vermelha = presente (achado patologico)
// Badge amarela = leve/borderline
```

### Arquivo: src/components/exam/MeasurementsTable.tsx

Tabela de medidas com valores de referencia:

| Parametro | Valor | Classificacao |
|-----------|-------|---------------|
| Espessura Central | 192 um | Normal |
| Espessura Coroide | - | - |

---

## Modificacoes no ExamView.tsx

Substituir o bloco de exibicao de achados (linhas 741-757):

**ANTES:**
```jsx
{exam.analysis.findings && (
  <AccordionItem value="findings">
    <AccordionTrigger>Achados</AccordionTrigger>
    <AccordionContent>
      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
        {JSON.stringify(exam.analysis.findings, null, 2)}
      </pre>
    </AccordionContent>
  </AccordionItem>
)}
```

**DEPOIS:**
```jsx
<AnalysisDisplay 
  examType={exam.exam_type}
  analysis={exam.analysis}
  eye={exam.eye}
/>
```

O novo componente substitui todo o Accordion existente com uma visualizacao estruturada e profissional.

---

## Estrutura Visual do Novo Display

```text
+--------------------------------------------------+
| ANALISE DA IA                       [Re-analisar] |
+--------------------------------------------------+
| Qualidade: [Boa ✓]                               |
+--------------------------------------------------+
| INTERFACE VITREORRETINIANA                       |
| ┌──────────────────────────────────────────────┐ |
| │ MLI  [Alterada !]                            │ |
| │ Presenca de linha hiperreflectiva aderida    │ |
| │ a superficie, compativel com MER             │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| CAMADAS RETINIANAS INTERNAS                      |
| ┌──────────────────────────────────────────────┐ |
| │ CFNR [Normal ✓] Espessura e reflet. normais  │ |
| │ CCG  [Normal ✓] Espessura e reflet. normais  │ |
| │ CPI  [Normal ✓] Espessura e reflet. normais  │ |
| │ CNI  [Normal ✓] Espessura e reflet. normais  │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| CAMADAS RETINIANAS EXTERNAS                      |
| ┌──────────────────────────────────────────────┐ |
| │ CPE  [Normal ✓] Espessura e reflet. normais  │ |
| │ CNE  [Normal ✓] Espessura e reflet. normais  │ |
| │ ZE   [Normal ✓] Linha continua               │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| COMPLEXO EPR-CORIOCAPILAR                        |
| ┌──────────────────────────────────────────────┐ |
| │ EPR  [Normal ✓] Integro, sem descontinuidade │ |
| │ MB   [Normal ✓] Continua                     │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| MEDIDAS                                          |
| ┌──────────────────────────────────────────────┐ |
| │ Espessura Central Foveal: 192 um [Normal]    │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| BIOMARCADORES                                    |
| ┌──────────────────────────────────────────────┐ |
| │ [MER Leve] [Sem fluido] [Sem drusas]        │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| NOTAS CLINICAS                                   |
| ┌──────────────────────────────────────────────┐ |
| │ Analise baseada no exame do olho esquerdo... │ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| IMPRESSAO DIAGNOSTICA                            |
| • Membrana Epirretiniana Leve (Celofane Macular) |
| • Achados similares e simetricos em OD           |
+--------------------------------------------------+
| RECOMENDACOES                                    |
| • Monitoramento clinico e OCT seriado            |
| • Auto-monitoramento com Tela de Amsler          |
| • Nao ha indicacao cirurgica no momento          |
+--------------------------------------------------+
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/exam/AnalysisDisplay.tsx` | Componente principal (router por tipo) |
| `src/components/exam/OctMacularDisplay.tsx` | Display OCT Macular |
| `src/components/exam/OctNerveDisplay.tsx` | Display OCT Nervo Optico |
| `src/components/exam/RetinographyDisplay.tsx` | Display Retinografia |
| `src/components/exam/BiomarkersDisplay.tsx` | Badges de biomarcadores |
| `src/components/exam/MeasurementsTable.tsx` | Tabela de medidas |
| `src/components/exam/LayerItem.tsx` | Item individual de camada |
| `src/components/exam/analysisLabels.ts` | Dicionario de labels PT-BR |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/ExamView.tsx` | Substituir secao de Achados pelo AnalysisDisplay |
| `src/components/pdf/ExamReportPdf.tsx` | Adaptar formatacao para PDF |

---

## Beneficios

1. **Laudo Profissional**: Exibicao formatada e estruturada
2. **Codigo Reutilizavel**: Componentes modulares por tipo de exame
3. **Consistencia**: Mesma estrutura visual no frontend e PDF
4. **Legibilidade**: Badges coloridas para status rapido
5. **Escalabilidade**: Facil adicionar novos tipos de exame
6. **Internacionalizacao**: Labels centralizadas em arquivo separado

---

## Consideracoes Tecnicas

- Os componentes usarao shadcn/ui existentes (Card, Badge, Table)
- Cores seguirao o design system atual (status-normal, status-abnormal, etc)
- Tooltips explicativos para termos medicos
- Responsividade para visualizacao mobile
- A mesma logica de formatacao sera usada no PDF para consistencia
