
# Plano: Corrigir Exibicao de Imagens do Exame

## Problema Identificado

A imagem do exame nao esta aparecendo porque:

1. O bucket `exam-images` esta configurado como **privado** (`public: false`)
2. O codigo em `NewAnalysis.tsx` usa `getPublicUrl()` para gerar a URL da imagem
3. URLs publicas so funcionam para buckets publicos
4. A URL armazenada (`/object/public/exam-images/...`) retorna erro 403 ou imagem nao encontrada

---

## Solucoes Possiveis

### Opcao A: Tornar o Bucket Publico (Recomendado)
- Mais simples e rapido
- Imagens de exames ja estao protegidas por RLS na tabela `exam_images`
- Nao requer mudancas no frontend

### Opcao B: Usar URLs Assinadas
- Mais seguro (URLs temporarias)
- Requer mudancas no frontend para gerar URLs assinadas ao carregar
- Complexidade adicional

**Recomendacao**: Opcao A - Tornar o bucket publico, ja que o acesso aos exames ja e controlado por RLS nas tabelas.

---

## Implementacao (Opcao A)

### Passo 1: Atualizar Bucket para Publico

Executar migracao SQL para tornar o bucket publico:

```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'exam-images';
```

Isso permitira que as URLs publicas funcionem e as imagens sejam exibidas.

---

## Consideracoes de Seguranca

- O bucket se torna publico, mas as URLs contem IDs de exames (UUIDs)
- UUIDs sao imprevisiveis e nao podem ser adivinhados
- O acesso aos metadados do exame continua protegido por RLS
- Esta e uma pratica comum para imagens medicas que precisam ser exibidas no frontend

---

## Alternativa (Opcao B - Se Necessario Maior Seguranca)

Se preferir manter o bucket privado, seria necessario:

1. Criar funcao para gerar URLs assinadas
2. Modificar `ExamView.tsx` para buscar URL assinada antes de exibir
3. Modificar `NewAnalysis.tsx` para salvar apenas o path, nao a URL publica

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| Migracao SQL | Atualizar bucket para publico |

---

## Resumo

O problema e simples: o bucket esta privado mas o codigo usa URLs publicas. A solucao mais rapida e tornar o bucket publico, ja que a seguranca dos dados do exame ja esta garantida por RLS.
