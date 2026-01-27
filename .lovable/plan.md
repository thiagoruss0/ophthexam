
# Plano de Implementacao: Melhorias e Funcionalidades OphtalAI

## Resumo Executivo

Este plano aborda a implementacao das melhorias solicitadas para o OphtalAI, seguindo a ordem de prioridade definida. O foco principal e na geracao de PDF profissional, compartilhamento de laudos e melhoria das paginas existentes.

---

## 1. GERACAO DE PDF DO LAUDO (Prioridade 1)

### Objetivo
Implementar geracao de PDF profissional na pagina `/exame/:id` com todas as informacoes do laudo.

### Arquivos a Criar

#### 1.1. Instalar Dependencia
Adicionar `@react-pdf/renderer` ao projeto (biblioteca React para geracao de PDFs).

#### 1.2. Criar Componente PDF
**Arquivo:** `src/components/pdf/ExamReportPdf.tsx`

Estrutura do documento PDF:
- Cabecalho da clinica (logo opcional baseado em `include_logo_in_pdf`)
- Dados do paciente (nome, prontuario, data nascimento)
- Dados do exame (tipo, olho, data, equipamento, indicacao clinica)
- Imagem do exame (miniatura redimensionada)
- Secao de Achados da IA (formatado em texto legivel)
- Secao de Biomarcadores (lista com badges de status)
- Medicoes (tabela formatada)
- Impressao Diagnostica
- Recomendacoes
- Observacoes do Medico
- DISCLAIMER obrigatorio em destaque
- Assinatura digital (opcional baseado em `include_signature_in_pdf`)
- Rodape com data de aprovacao e CRM do medico

#### 1.3. Criar Utilitario de Geracao
**Arquivo:** `src/utils/generatePdf.ts`

Funcoes:
- `generateExamPdf(data: ReportData): Promise<Blob>` - Gera o blob do PDF
- `downloadPdf(blob: Blob, filename: string)` - Inicia download local
- `uploadPdfToStorage(blob: Blob, examId: string)` - Upload para Supabase Storage

#### 1.4. Atualizar ExamView.tsx

Adicionar funcionalidade aos botoes existentes (linhas 507-514):
- Estado `isExporting` para loading
- Funcao `handleExportPdf` que:
  1. Busca dados completos do exame, analise e perfil
  2. Chama `generateExamPdf`
  3. Faz upload para bucket `report-pdfs`
  4. Atualiza `reports.pdf_url`
  5. Inicia download local
  6. Exibe toast de sucesso

---

## 2. PAGINA DE CONFIGURACOES COMPLETA (Prioridade 2)

### Objetivo
Expandir `/configuracoes` para suportar upload de logo, assinatura e mais opcoes.

### Arquivos a Modificar

#### 2.1. Atualizar Settings.tsx

**Tab Perfil - Adicionar:**
- Upload de avatar com preview e crop
- Componente de desenho de assinatura digital OU upload de imagem

**Tab Clinica - Adicionar:**
- Upload de logo da clinica com preview

**Tab Laudo - Adicionar:**
- Preview do cabecalho do PDF
- Campo de rodape customizado

**Tab Preferencias - Adicionar:**
- Toggle de resumo diario

**Nova Tab Seguranca:**
- Formulario de alteracao de senha
- Lista de sessoes ativas (se disponivel)

#### 2.2. Criar Componente de Upload
**Arquivo:** `src/components/settings/ImageUpload.tsx`

Componente reutilizavel para:
- Upload de imagem com drag-and-drop
- Preview da imagem
- Compressao automatica (max 500KB)
- Upload para buckets do Supabase Storage

#### 2.3. Criar Componente de Assinatura
**Arquivo:** `src/components/settings/SignaturePad.tsx`

Componente para:
- Desenhar assinatura com canvas
- Limpar e refazer
- Salvar como PNG
- Upload para bucket `signatures`

---

## 3. COMPARTILHAMENTO DE LAUDO (Prioridade 3)

### Objetivo
Permitir compartilhar laudo via link temporario publico.

### Arquivos a Criar

#### 3.1. Edge Function
**Arquivo:** `supabase/functions/share-report/index.ts`

Funcionalidade:
- Recebe `report_id` e `expires_in_hours` (padrao 72h)
- Gera token unico (UUID ou crypto random)
- Atualiza `reports.share_token` e `reports.share_expires_at`
- Retorna link publico: `/laudo-compartilhado/{token}`

#### 3.2. Pagina Publica
**Arquivo:** `src/pages/SharedReport.tsx`

Caracteristicas:
- Rota publica (sem autenticacao)
- Busca report por `share_token`
- Valida `share_expires_at > now()`
- Exibe laudo em layout limpo para impressao
- Botao para download do PDF (se disponivel)
- Design profissional e responsivo

#### 3.3. Atualizar App.tsx
Adicionar rota publica `/laudo-compartilhado/:token`

#### 3.4. Atualizar ExamView.tsx
Implementar funcao `handleShare`:
- Chama Edge Function `share-report`
- Exibe dialog com link gerado
- Botao para copiar link
- Opcao de enviar por WhatsApp/Email

---

## 4. PAGINA DE HISTORICO COM FILTROS (Prioridade 4)

### Objetivo
Melhorar `/historico` com mais filtros e exportacao.

### Arquivos a Modificar

#### 4.1. Atualizar History.tsx

**Novos Filtros:**
- Filtro por periodo (DateRangePicker com data inicio e fim)
- Limpar todos os filtros

**Melhorias na Tabela:**
- Coluna de thumbnail da imagem
- Botoes de acao: Ver, Editar (se nao aprovado), Excluir (se nao aprovado)
- Ordenacao clicavel nas colunas

**Exportacao CSV:**
- Implementar `handleExportCsv` que gera arquivo CSV
- Campos: Paciente, Tipo, Olho, Data, Status, Diagnostico

#### 4.2. Criar Componente DateRangePicker
**Arquivo:** `src/components/ui/date-range-picker.tsx`

Componente usando `react-day-picker` (ja instalado) para selecao de intervalo de datas.

---

## 5. PAGINA DO PACIENTE COMPLETA (Prioridade 5)

### Objetivo
Expandir `/paciente/:id` com edicao, comparacao e graficos.

### Arquivos a Modificar/Criar

#### 5.1. Atualizar Patient.tsx

**Cabecalho Editavel:**
- Modo de edicao inline para dados do paciente
- Botao Editar/Salvar

**Timeline Melhorada:**
- Thumbnails das imagens
- Indicadores visuais de evolucao

**Nova Secao: Comparacao de Exames:**
- Selecionar 2 exames do mesmo tipo
- Exibir imagens lado a lado
- Tabela comparativa de medidas
- Salvar comparacao em `exam_comparisons`

**Nova Secao: Grafico de Evolucao:**
- Para OCT Macular: espessura central foveal ao longo do tempo
- Para OCT Nervo: RNFL medio ao longo do tempo
- Usar Recharts (ja instalado)

**Acoes:**
- Botao "Novo Exame" (redireciona para `/nova-analise` com paciente pre-selecionado)
- Botao "Arquivar Paciente" (soft delete)

#### 5.2. Criar Componente de Comparacao
**Arquivo:** `src/components/patient/ExamComparison.tsx`

---

## 6. PAINEL ADMIN COMPLETO (Prioridade 6)

### Objetivo
Expandir `/admin` com estatisticas e configuracoes.

### Arquivos a Modificar

#### 6.1. Atualizar Admin.tsx

**Nova Tab Estatisticas:**
- Grafico de exames por dia/semana/mes (LineChart com Recharts)
- Exames por tipo (PieChart)
- Tempo medio de analise (se disponivel no banco)
- Taxa de aprovacao

**Nova Tab Configuracoes (futuro):**
- Placeholder para configuracoes do sistema
- Limites de uso
- Status da API

---

## 7. MELHORIAS NA LANDING PAGE (Prioridade 7)

### Objetivo
Atualizar `/` com design mais informativo.

### Arquivos a Modificar

#### 7.1. Atualizar componentes em src/components/landing/

**HeroSection.tsx:**
- Animacao de exame sendo analisado
- CTA mais destacado

**ExamTypesSection.tsx (ja existe):**
- Adicionar exemplos visuais de analise
- Cards interativos com hover

**BenefitsSection.tsx (ja existe):**
- Icones mais elaborados
- Animacoes sutis de entrada

**Novo: DisclaimerSection.tsx:**
- Secao dedicada ao disclaimer legal
- Design que transmita confianca e profissionalismo

**Footer.tsx:**
- Links para Termos de Uso e Politica de Privacidade
- Contato

---

## 8. FUNCIONALIDADE DE RE-ANALISE (Prioridade 8)

### Objetivo
Permitir re-analisar imagem se analise inicial teve problemas.

### Arquivos a Modificar

#### 8.1. Atualizar ExamView.tsx

Adicionar botao "Re-analisar" quando:
- `exam.status !== "approved"`
- `exam.analysis` existe mas com problemas

Funcao `handleReanalyze`:
1. Deletar analise anterior (`ai_analysis`)
2. Atualizar status do exame para `analyzing`
3. Chamar Edge Function `analyze-image`
4. Recarregar dados

---

## 9. MELHORIAS NA EXIBICAO DE ANALISE (Prioridade 8)

### Objetivo
Melhorar UX da visualizacao de analise no ExamView.

### Arquivos a Criar

#### 9.1. Criar Componente AnalysisDisplay
**Arquivo:** `src/components/exam/AnalysisDisplay.tsx`

Caracteristicas:
- Biomarcadores como badges coloridas (verde/amarelo/vermelho)
- Medidas com indicador visual (barra de progresso ou gauge)
- Secoes expansiveis/colapsaveis
- Tooltips com explicacoes de termos medicos
- Highlight de achados importantes

---

## 10. RESPONSIVIDADE (Continuo)

### Verificacoes em Todas as Paginas

- Dashboard: cards empilhados em mobile, grafico menor
- Nova Analise: wizard em tela cheia, botoes grandes
- Visualizacao de Exame: imagem expandivel, analise em abas no mobile
- Historico: lista simplificada com swipe actions

---

## Cronograma de Implementacao Sugerido

| Fase | Itens | Estimativa |
|------|-------|------------|
| 1 | PDF + Settings (upload logo/assinatura) | Alta complexidade |
| 2 | Compartilhamento + Historico melhorado | Media complexidade |
| 3 | Pagina Paciente + Admin stats | Media complexidade |
| 4 | Landing Page + Re-analise + UX | Baixa complexidade |

---

## Dependencias a Instalar

```json
{
  "@react-pdf/renderer": "^3.4.4"
}
```

---

## Resumo de Arquivos

### Novos Arquivos (12)
1. `src/components/pdf/ExamReportPdf.tsx`
2. `src/utils/generatePdf.ts`
3. `src/components/settings/ImageUpload.tsx`
4. `src/components/settings/SignaturePad.tsx`
5. `supabase/functions/share-report/index.ts`
6. `src/pages/SharedReport.tsx`
7. `src/components/ui/date-range-picker.tsx`
8. `src/components/patient/ExamComparison.tsx`
9. `src/components/landing/DisclaimerSection.tsx`
10. `src/components/exam/AnalysisDisplay.tsx`
11. `src/pages/Terms.tsx` (Termos de Uso)
12. `src/pages/Privacy.tsx` (Politica de Privacidade)

### Arquivos a Modificar (8)
1. `src/pages/ExamView.tsx` - PDF export, share, re-analyze
2. `src/pages/Settings.tsx` - Upload de imagens, assinatura
3. `src/pages/History.tsx` - Filtros, exportacao
4. `src/pages/Patient.tsx` - Edicao, comparacao, graficos
5. `src/pages/Admin.tsx` - Estatisticas, graficos
6. `src/App.tsx` - Nova rota publica
7. `src/components/landing/HeroSection.tsx` - Animacao
8. `src/components/landing/Footer.tsx` - Links legais

---

## Consideracoes de Seguranca

- RLS: Todas as tabelas ja possuem RLS configurado
- Validacao: Usar Zod em todos os formularios novos
- Upload: Validar tipo e tamanho de arquivos antes do upload
- Compartilhamento: Token expira automaticamente, validacao server-side
- LGPD: Manter logs de acesso, opcao de exportar/deletar dados

---

## Proximos Passos

Apos aprovacao deste plano, vou implementar na seguinte ordem:

1. Instalar `@react-pdf/renderer`
2. Criar componente PDF e utilitario de geracao
3. Integrar botao "Exportar PDF" no ExamView
4. Adicionar upload de logo e assinatura nas Configuracoes
5. Criar Edge Function e pagina de compartilhamento
6. Melhorar pagina de Historico com filtros
7. Expandir pagina do Paciente
8. Adicionar estatisticas ao Admin
9. Melhorias visuais na Landing Page
10. Funcionalidade de re-analise
