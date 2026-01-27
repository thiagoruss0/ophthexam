

# Plano: Adicionar Funcao de Deletar Exame

## Objetivo

Adicionar um botao de exclusao na tabela de historico de exames que permite ao medico deletar exames com confirmacao de seguranca.

---

## Arquitetura da Solucao

### 1. Componente de Interface

Adicionar na coluna "Acoes" da tabela um botao de lixeira (Trash) ao lado do botao de visualizar (Eye), que abre um dialogo de confirmacao antes de executar a exclusao.

### 2. Estrutura Visual

```text
+-------------------------------------------+
| Acoes                                     |
| [Eye] [Trash]                             |
+-------------------------------------------+

Ao clicar em Trash:
+------------------------------------------+
| Excluir Exame?                           |
|------------------------------------------|
| Esta acao nao pode ser desfeita.         |
| O exame e todos os dados associados      |
| (imagens, analises, laudos) serao        |
| permanentemente removidos.               |
|                                          |
| Paciente: ADALGIZA MARIA COSTA DANTAS    |
| Tipo: OCT Macular                        |
| Data: 31/10/2023                         |
|                                          |
|        [Cancelar] [Excluir]              |
+------------------------------------------+
```

---

## Implementacao Detalhada

### Modificacoes no History.tsx

**1. Adicionar imports necessarios:**
```typescript
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

**2. Adicionar estado para controle de exclusao:**
```typescript
const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
```

**3. Criar funcao de exclusao:**
```typescript
const handleDeleteExam = async (examId: string) => {
  setDeletingExamId(examId);
  try {
    // Deletar imagens do Storage primeiro
    const { data: images } = await supabase
      .from("exam_images")
      .select("image_url")
      .eq("exam_id", examId);
    
    if (images && images.length > 0) {
      const paths = images.map(img => {
        // Extrair path do URL
        const url = new URL(img.image_url);
        return url.pathname.split('/exam-images/')[1];
      }).filter(Boolean);
      
      if (paths.length > 0) {
        await supabase.storage
          .from("exam-images")
          .remove(paths);
      }
    }
    
    // Deletar exame (cascade deleta images, analysis, reports, feedback)
    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("id", examId);

    if (error) throw error;

    toast({ title: "Exame excluido com sucesso!" });
    
    // Atualizar lista
    fetchExams();
  } catch (error) {
    console.error("Error deleting exam:", error);
    toast({ 
      title: "Erro ao excluir exame", 
      variant: "destructive" 
    });
  } finally {
    setDeletingExamId(null);
  }
};
```

**4. Adicionar botao na coluna de acoes:**
```tsx
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-1">
    <Link to={`/exame/${exam.id}`}>
      <Button variant="ghost" size="icon">
        <Eye className="h-4 w-4" />
      </Button>
    </Link>
    
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Exame?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Esta acao nao pode ser desfeita.</p>
            <p>O exame e todos os dados associados (imagens, analises, laudos) serao permanentemente removidos.</p>
            <div className="mt-4 p-3 bg-muted rounded-md text-sm">
              <p><strong>Paciente:</strong> {exam.patient_name}</p>
              <p><strong>Tipo:</strong> {examTypeLabels[exam.exam_type]}</p>
              <p><strong>Data:</strong> {new Date(exam.exam_date).toLocaleDateString("pt-BR")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDeleteExam(exam.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deletingExamId === exam.id}
          >
            {deletingExamId === exam.id ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</TableCell>
```

---

## Seguranca

A exclusao ja esta protegida por RLS no banco de dados:
- Policy `"Approved doctors can delete their exams"` garante que apenas o medico dono pode excluir
- Cascade delete remove automaticamente: `exam_images`, `ai_analysis`, `reports`, `ai_feedback`
- Imagens no Storage sao deletadas manualmente antes do registro

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/History.tsx` | Adicionar AlertDialog, estado de loading, funcao de delete, botao na tabela |

---

## Fluxo de Exclusao

```text
1. Usuario clica no icone de lixeira
   |
   v
2. AlertDialog abre com detalhes do exame
   |
   v
3. Usuario confirma clicando em "Excluir"
   |
   v
4. Sistema deleta imagens do Storage
   |
   v
5. Sistema deleta exame do banco
   |
   v
6. Cascade delete remove dados relacionados
   |
   v
7. Toast de sucesso e lista atualizada
```

---

## Consideracoes

- Botao de exclusao fica vermelho para indicar acao destrutiva
- Loading spinner durante a exclusao
- Detalhes do exame mostrados no dialogo para evitar exclusao acidental
- Funciona com as RLS policies existentes (medico so pode excluir seus proprios exames)
- Storage cleanup garante que imagens nao ficam orfas

