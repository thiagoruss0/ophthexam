# Plano Implementado ✓

## Funcionalidade: Timeout e Detecção Automática de Falha na Análise de IA

### Status: Concluído

**Alterações realizadas:**

1. **ExamView.tsx:**
   - Adicionado timeout de 2 minutos para análises
   - Timer visual mostrando tempo decorrido
   - Após 1 minuto: card amarelo com aviso "demorando mais que o normal"
   - Após 2 minutos: reverte status para "pending" automaticamente
   - Botão "Re-analisar" sempre visível (não apenas quando já existe análise)
   - Novo card amarelo para exames pendentes sem análise

2. **NewAnalysis.tsx:**
   - Toast de erro específico quando a Edge Function falha
   - Usuário é notificado sobre a falha e redirecionado para a página do exame
