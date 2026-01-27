

# OphtalAI - Plano de Implementação Completo

## Visão Geral do Projeto
Aplicativo web profissional para análise de imagens oftalmológicas (OCT Macular, OCT Nervo Óptico e Retinografia) utilizando inteligência artificial, com geração de laudos estruturados para revisão médica.

---

## Fase 1: Fundação e Autenticação

### 1.1 Configuração do Backend (Lovable Cloud + Supabase)
- Configurar Lovable Cloud para edge functions e storage
- Criar estrutura do banco de dados com todas as tabelas especificadas:
  - `profiles` (dados do médico, CRM, status de aprovação)
  - `user_roles` (admin/médico - tabela separada para segurança)
  - `patients` (dados dos pacientes)
  - `exams` (exames cadastrados)
  - `exam_images` (imagens dos exames)
  - `ai_analysis` (resultados da análise IA)
  - `reports` (laudos finalizados)
  - `exam_comparisons` (comparativos entre exames)
- Implementar RLS (Row Level Security) para todas as tabelas
- Configurar Storage bucket para imagens de exames e PDFs

### 1.2 Sistema de Autenticação
- Página de Login com email/senha
- Página de Cadastro com campos:
  - Nome completo, Email, Senha
  - CRM e UF do CRM (validação de formato)
  - Especialidade (Oftalmologia/Retina/Glaucoma)
- Sistema de aprovação (novos cadastros ficam como "pendentes")
- Recuperação de senha por email
- Proteção de rotas (apenas médicos aprovados acessam o sistema)

---

## Fase 2: Interface Principal

### 2.1 Landing Page
- Design profissional médico (paleta azul #0066CC)
- Header com logo "OphtalAI" e navegação
- Hero section com proposta de valor
- Cards de benefícios (3 principais)
- Seção "Como funciona" (4 passos ilustrados)
- Seção de tipos de exame suportados
- Footer com disclaimer médico obrigatório
- CTAs de Login e Cadastro

### 2.2 Dashboard do Médico
- Saudação personalizada "Olá, Dr. [Nome]"
- Cards de métricas:
  - Total de exames do mês
  - Laudos pendentes
  - Laudos finalizados
  - Gráfico de distribuição por tipo de exame
- Lista dos últimos 10 exames com:
  - Thumbnail, paciente, tipo (badges coloridos), olho, data, status
- Filtros e busca
- Botão flutuante "Nova Análise"

---

## Fase 3: Fluxo de Análise

### 3.1 Wizard de Nova Análise (4 etapas)
**Etapa 1 - Paciente:**
- Busca de paciente existente (autocomplete)
- Formulário de cadastro de novo paciente

**Etapa 2 - Exame:**
- Seleção do tipo de exame com descrições
- Escolha do olho (OD/OE/Ambos)
- Data, equipamento, indicação clínica

**Etapa 3 - Upload:**
- Área de drag-and-drop para imagens
- Suporte a JPG, PNG, TIFF, DICOM (até 20MB)
- Preview com zoom
- Upload múltiplo para "Ambos os olhos"

**Etapa 4 - Confirmação:**
- Resumo dos dados
- Confirmação e início da análise
- Feedback visual durante processamento

### 3.2 Visualização do Exame
- Layout duas colunas (imagem + laudo)
- Controles de visualização da imagem (zoom, tela cheia)
- Laudo IA estruturado em accordions:
  - Seções específicas por tipo de exame
  - Biomarcadores detectados (badges)
  - Medidas e classificações
  - Impressão diagnóstica
- Área de edição médica:
  - Checkboxes para confirmar/remover achados
  - Campo para observações
  - Opção de regenerar análise
- Ações: Salvar rascunho, Aprovar laudo, Exportar PDF, Compartilhar

---

## Fase 4: Funcionalidades Avançadas

### 4.1 Histórico de Exames
- Busca avançada por paciente
- Filtros: período, tipo, status, diagnóstico
- Tabela com ordenação e paginação
- Exportação para CSV

### 4.2 Perfil do Paciente
- Dados cadastrais completos
- Timeline de todos os exames
- Comparativo lado a lado de exames
- Gráfico de evolução temporal

### 4.3 Configurações
- Perfil do médico
- Dados da clínica (logo, endereço)
- Personalização do laudo (template, assinatura)
- Preferências (tema, idioma, notificações)

---

## Fase 5: Painel Administrativo

### 5.1 Dashboard Admin
- Lista de médicos pendentes de aprovação
- Ações: Aprovar / Rejeitar / Solicitar documentos
- Lista de todos os médicos cadastrados
- Gerenciamento de status (ativar/suspender)
- Estatísticas de uso do sistema

---

## Fase 6: Edge Functions

### 6.1 analyze-image
- Recebe exame e imagem
- Integração com Lovable AI (Google Gemini)
- Utiliza seus prompts específicos por tipo de exame
- Retorna análise estruturada em JSON
- Salva resultado em `ai_analysis`

### 6.2 generate-pdf
- Gera PDF profissional com:
  - Cabeçalho com logo da clínica
  - Dados do paciente e exame
  - Imagem do exame
  - Laudo completo estruturado
  - Assinatura digital do médico
  - Disclaimer obrigatório
- Upload automático para Storage

### 6.3 share-report
- Gera token único de compartilhamento
- Define expiração (padrão 7 dias)
- Retorna link público temporário

---

## Elementos de Design

### Paleta de Cores
- Primary: #0066CC (azul médico)
- Success/Normal: #00AA88 (verde)
- Warning/Borderline: #FF9900 (laranja)
- Danger/Anormal: #CC3333 (vermelho)
- Background: #F8FAFC

### Componentes UI
- Cards com sombra suave
- Badges coloridos para classificações
- Accordions para seções do laudo
- Tooltips explicativos
- Skeletons durante carregamento
- Toasts para feedback
- Modais de confirmação

### Responsividade
- Desktop: layout completo duas colunas
- Tablet: colunas empilhadas
- Mobile: funcional mas otimizado para tablet+

---

## Segurança e Compliance

- Autenticação robusta com Supabase Auth
- RLS em todas as tabelas
- Tabela separada para roles (prevenção de escalação de privilégios)
- Criptografia de dados sensíveis (CPF)
- Links de compartilhamento com expiração
- Disclaimer médico em todas as telas de laudo
- Log de auditoria para ações críticas

---

## Próximos Passos Após Implementação

Quando clicar em "Implementar plano", vou precisar que você:
1. **Compartilhe os prompts** para cada tipo de exame (OCT Macular, OCT Nervo Óptico, Retinografia)
2. **Forneça o logo** do OphtalAI se você tiver um pronto
3. **Confirme** se há algum template específico de laudo que você usa atualmente

