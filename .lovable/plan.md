

## Plano: Reorganizar Layout da Página de Visualização de Exame

### Problema Identificado
A página de visualização do exame (`/exame/:id`) atualmente exibe a imagem e a análise da IA **lado a lado** em um grid de 5 colunas (3 + 2). Para exames bilaterais, isso resulta em:
- Dois cards (OD e OE) comprimidos em espaço muito pequeno
- Texto cortado e desalinhado dentro dos boxes
- Layout visualmente confuso como mostrado na screenshot

### Solução Proposta
Alterar o layout para **empilhar verticalmente**:
1. **Imagem do exame** em largura total (100%)
2. **Análise da IA** abaixo da imagem, também em largura total
3. **Observações do médico** na sequência

Isso permitirá que os cards bilaterais (OD e OE) tenham mais espaço horizontal, corrigindo o desalinhamento.

---

### Alterações Técnicas

#### Arquivo: `src/pages/ExamView.tsx`

**Modificação 1** - Alterar a estrutura do grid principal (linha ~567):

De:
```tsx
<div className="grid gap-6 lg:grid-cols-5">
  {/* Image Section */}
  <div className="lg:col-span-3 space-y-4">
    ...
  </div>
  {/* Analysis Section */}
  <div className="lg:col-span-2 space-y-4">
    ...
  </div>
</div>
```

Para:
```tsx
<div className="space-y-6">
  {/* Image Section - Full Width */}
  <div className="space-y-4">
    <Card>
      ...imagem com altura máxima ajustada...
    </Card>
  </div>
  
  {/* Analysis Section - Full Width Below Image */}
  <div className="space-y-4">
    ...cards de análise...
  </div>
</div>
```

**Modificação 2** - Ajustar altura máxima da imagem:
- Reduzir `maxHeight` de `500px` para `400px` para economizar espaço vertical
- A imagem permanecerá com zoom funcional

**Modificação 3** - Layout responsivo para observações do médico:
- Em telas grandes, colocar os botões de ação lado a lado
- Manter o comportamento empilhado em mobile

---

### Resultado Esperado

```text
+------------------------------------------+
|           Imagem do Exame (100%)         |
|  [zoom controls]   [image preview]       |
+------------------------------------------+

+------------------------------------------+
|           Análise da IA (100%)           |
| +-----------------+ +-----------------+  |
| | Olho Direito    | | Olho Esquerdo   |  |
| | (OD)            | | (OE)            |  |
| | - Interface...  | | - Interface...  |  |
| | - Depressão...  | | - Depressão...  |  |
| +-----------------+ +-----------------+  |
| [Comparação Bilateral]                   |
| [Diagnóstico] [Recomendações]            |
+------------------------------------------+

+------------------------------------------+
|        Observações do Médico             |
|  [Textarea] [Salvar] [Aprovar]           |
+------------------------------------------+
```

Os cards OD e OE terão aproximadamente o dobro do espaço horizontal atual, permitindo que o conteúdo seja exibido corretamente sem cortes ou desalinhamentos.

