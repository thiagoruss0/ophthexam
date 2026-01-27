

# Plano: Edge Function "analyze-image"

## Objetivo
Criar uma Edge Function que analisa imagens oftalmológicas usando Lovable AI (Google Gemini) com os prompts específicos fornecidos para cada tipo de exame.

---

## Arquitetura da Solução

```text
+-------------------+      +--------------------+      +------------------+
|  Frontend (React) | ---> | Edge Function      | ---> | Lovable AI       |
|  NewAnalysis.tsx  |      | analyze-image      |      | (Gemini Pro)     |
+-------------------+      +--------------------+      +------------------+
         |                          |                          |
         |  POST { exam_id }        |  1. Busca exam + images  |
         |                          |  2. Seleciona prompt     |
         |                          |  3. Envia para AI        |
         |                          |  4. Salva em ai_analysis |
         |                          |  5. Atualiza exam status |
         |                          |                          |
         +<---- Redirect -----------+<---- JSON Response ------+
```

---

## Implementacao

### 1. Criar Edge Function

**Arquivo:** `supabase/functions/analyze-image/index.ts`

**Funcionalidades:**
- Receber `exam_id` no body da requisicao
- Buscar dados do exame e imagens no Supabase
- Selecionar o prompt correto baseado no `exam_type`
- Baixar a imagem e converter para base64
- Enviar para Lovable AI Gateway com modelo `google/gemini-2.5-pro` (melhor para imagens)
- Parsear resposta JSON da IA
- Salvar resultado estruturado na tabela `ai_analysis`
- Atualizar status do exame para `analyzed`
- Retornar resultado

### 2. Estrutura dos Prompts

Serao armazenados na propria Edge Function:

| Tipo de Exame | Prompt | Campos de Saida |
|---------------|--------|-----------------|
| `oct_macular` | Analise de camadas retinianas, biomarcadores, medidas | quality, layers, biomarkers, measurements, diagnosis |
| `oct_nerve` | Analise de RNFL, disco optico, celulas ganglionares | quality, rnfl, optic_disc, ganglion_cell_analysis, biomarkers_glaucoma, risk_classification |
| `retinography` | Analise de fundo de olho completo | quality, optic_disc, macula, vessels, retina_general, biomarkers, classifications |

### 3. Mapeamento de Campos para ai_analysis

| Campo do Prompt | Coluna ai_analysis |
|-----------------|-------------------|
| quality | quality_score |
| layers/biomarkers | findings (JSON) |
| biomarcadores especificos | biomarkers (JSON) |
| rnfl/optic_disc | optic_nerve_analysis (JSON) |
| macula/vessels/retina_general | retinography_analysis (JSON) |
| measurements | measurements (JSON) |
| diagnosis.primary | diagnosis (array) |
| recommendations | recommendations (array) |
| risk_classification | risk_classification |
| resposta completa | raw_response (JSON) |

### 4. Atualizar config.toml

Adicionar configuracao da nova funcao com `verify_jwt = false` (validacao feita no codigo).

---

## Fluxo de Execucao

1. **Receber requisicao** com `exam_id`
2. **Validar autenticacao** via header Authorization
3. **Buscar exame** no banco de dados
4. **Buscar imagens** associadas ao exame
5. **Baixar primeira imagem** e converter para base64
6. **Selecionar prompt** baseado no `exam_type`
7. **Chamar Lovable AI** com imagem + prompt
8. **Parsear resposta** JSON
9. **Mapear campos** para estrutura do banco
10. **Inserir em ai_analysis**
11. **Atualizar exame** para status `analyzed`
12. **Retornar sucesso** com ID da analise

---

## Tratamento de Erros

- **Exame nao encontrado**: Retorna 404
- **Sem imagens**: Retorna 400
- **Erro na IA**: Retorna 500 com mensagem
- **JSON invalido da IA**: Tenta extrair dados parciais
- **Rate limit (429)**: Informa usuario para tentar novamente
- **Creditos esgotados (402)**: Informa sobre necessidade de creditos

---

## Seguranca

- Validacao de JWT via `getClaims()`
- Verificacao de que o usuario tem acesso ao exame
- CORS headers configurados
- Logs para auditoria

---

## Detalhes Tecnicos

### Modelo de IA
- **Modelo:** `google/gemini-2.5-pro` (melhor para analise de imagens medicas)
- **Gateway:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **API Key:** `LOVABLE_API_KEY` (ja configurada automaticamente)

### Formato da Requisicao para IA
```json
{
  "model": "google/gemini-2.5-pro",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "<PROMPT_ESPECIFICO>" },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
      ]
    }
  ]
}
```

---

## Arquivos a Criar/Modificar

1. **Criar:** `supabase/functions/analyze-image/index.ts`
   - Edge Function completa com prompts e logica

2. **Modificar:** `supabase/config.toml`
   - Adicionar configuracao da funcao analyze-image

---

## Estimativa

A implementacao inclui:
- Edge Function com aproximadamente 400 linhas
- Os 3 prompts completos fornecidos
- Logica de tratamento de erros robusta
- Logging detalhado para debug

