
# Plano de Implementacao: Funcionalidades OphthExam

## Resumo das Funcionalidades

Este plano cobre 5 funcionalidades principais:
1. Compartilhamento de laudo via link publico
2. Filtro por data no historico
3. Exportacao CSV funcional
4. Re-analise de exame
5. Indicador de analise em progresso

---

## 1. COMPARTILHAMENTO DE LAUDO VIA LINK

### 1.1 Criar Edge Function share-report

**Arquivo:** `supabase/functions/share-report/index.ts`

Funcionalidade:
- Recebe `exam_id` e `expires_in_hours` (padrao 72h)
- Gera token unico de 32 caracteres
- Cria ou atualiza registro em `reports` com `share_token` e `share_expires_at`
- Retorna URL publica no formato `/laudo/{token}`

Estrutura:
- CORS headers configurados
- Validacao de autorizacao via header
- Tratamento de erros com mensagens claras

### 1.2 Atualizar config.toml

Adicionar configuracao:
```toml
[functions.share-report]
verify_jwt = false
```

### 1.3 Criar Pagina Publica SharedReport

**Arquivo:** `src/pages/SharedReport.tsx`

Caracteristicas:
- Rota publica sem autenticacao
- Busca report pelo `share_token` da URL
- Valida expiracao (`share_expires_at > now`)
- Layout limpo sem header/sidebar do dashboard
- Dados exibidos: paciente, exame, imagem, analise, medico
- Disclaimer obrigatorio sobre IA
- Botao "Imprimir" com `window.print()`
- Estados de erro para token invalido/expirado

### 1.4 Adicionar Rota no App.tsx

Rota publica fora do ProtectedRoute:
```tsx
<Route path="/laudo/:token" element={<SharedReport />} />
```

### 1.5 Atualizar ExamView.tsx

Adicoes:
- Estado `isSharing` (boolean)
- Funcao `handleShare`:
  1. Chama `supabase.functions.invoke('share-report', { body: { exam_id } })`
  2. Copia URL para clipboard
  3. Toast com data de expiracao
- Botao Compartilhar funcional (apenas quando `status === "approved"`)

---

## 2. FILTRO POR DATA NO HISTORICO

### Arquivo: `src/pages/History.tsx`

Adicoes:
- Estados `dateFrom` e `dateTo` (strings)
- Inputs type="date" no filtro existente
- Logica no `fetchExams`:
  ```typescript
  if (dateFrom) query = query.gte("exam_date", dateFrom);
  if (dateTo) query = query.lte("exam_date", dateTo);
  ```
- Adicionar `dateFrom` e `dateTo` nas dependencias do useEffect

Layout: inputs de data junto aos selects existentes

---

## 3. EXPORTACAO CSV FUNCIONAL

### Arquivo: `src/pages/History.tsx`

Funcao `handleExportCsv`:
1. Busca TODOS os exames (sem paginacao) com filtros ativos
2. Monta CSV com colunas: Paciente, Tipo, Olho, Data, Status
3. Separador ponto-e-virgula (Excel Brasil)
4. BOM UTF-8 para acentuacao correta
5. Download automatico: `exames_YYYY-MM-DD.csv`
6. Toast de sucesso

Conectar ao botao "Exportar CSV" existente na linha 139

---

## 4. RE-ANALISE DE EXAME

### Arquivo: `src/pages/ExamView.tsx`

Adicoes:
- Estado `isReanalyzing` (boolean)
- Funcao `handleReanalyze`:
  1. Confirm dialog de confirmacao
  2. Deleta `ai_analysis` se existir
  3. Atualiza `exams.status` para "analyzing"
  4. Chama Edge Function `analyze-image`
  5. Toast "Re-analise iniciada"
  6. setTimeout de 3s para recarregar dados

- Botao "Re-analisar" com icone RefreshCw
- Condicao: aparece apenas se `status !== "approved"`
- Disabled durante `isReanalyzing`

---

## 5. INDICADOR DE ANALISE EM PROGRESSO

### Arquivo: `src/pages/ExamView.tsx`

Card especial quando `status === "analyzing"`:
- Background azul claro (`bg-blue-50 border-blue-200`)
- Icone Loader2 com `animate-spin`
- Titulo: "Analise em andamento"
- Texto explicativo sobre tempo estimado

Auto-refresh:
- useEffect com setInterval de 5 segundos
- Chama `fetchExamData` periodicamente
- Cleanup no unmount ou quando status mudar

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/share-report/index.ts` | Edge Function para gerar link compartilhavel |
| `src/pages/SharedReport.tsx` | Pagina publica de visualizacao do laudo |

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `supabase/config.toml` | Adicionar config da funcao share-report |
| `src/App.tsx` | Adicionar rota publica `/laudo/:token` |
| `src/pages/ExamView.tsx` | Compartilhamento, re-analise, indicador de progresso |
| `src/pages/History.tsx` | Filtros de data, exportacao CSV |

---

## Detalhes Tecnicos

### Edge Function share-report
- CORS habilitado para todas origens
- Autenticacao via header Authorization
- Token de 32 caracteres alfanumericos
- Expiracao padrao de 72 horas

### Pagina SharedReport
- Busca direta no Supabase sem autenticacao (RLS permite via share_token)
- Design responsivo e otimizado para impressao
- Tratamento de estados: loading, erro, expirado, sucesso

### Auto-refresh no ExamView
- Interval de 5000ms quando status === "analyzing"
- Limpa automaticamente quando status muda
- Cleanup no useEffect return para evitar memory leaks

---

## Ordem de Implementacao

1. Edge Function `share-report`
2. Atualizar `config.toml`
3. Criar pagina `SharedReport.tsx`
4. Atualizar `App.tsx` com nova rota
5. Atualizar `ExamView.tsx` (compartilhamento + re-analise + indicador)
6. Atualizar `History.tsx` (filtros de data + CSV)
