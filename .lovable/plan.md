

## Plano: Ajustar Imagem para Caber na Viewport

### Problema Identificado
Atualmente a imagem do exame está com:
- `maxHeight: 400px` fixo no container
- `overflow: auto` que força rolagem
- Zoom aplicado com `transformOrigin: "top left"` que expande a imagem para fora do container

Isso resulta em uma imagem que precisa de scroll para ser visualizada por inteiro, especialmente em imagens de relatórios bilaterais que são mais altas.

### Solução Proposta
Alterar o comportamento da imagem para que ela:
1. **Caiba completamente na janela** sem necessidade de rolagem
2. **Mantenha a definição** usando `object-fit: contain`
3. **Preserve a funcionalidade de zoom** permitindo aumentar quando necessário

---

### Alterações Técnicas

#### Arquivo: `src/pages/ExamView.tsx`

**Modificação no Container da Imagem (linha ~596-609)**

De:
```tsx
<div className="relative overflow-auto bg-muted rounded-lg" style={{ maxHeight: "400px" }}>
  {exam.images[selectedImageIndex] ? (
    <img
      src={exam.images[selectedImageIndex].image_url}
      alt="Exam"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
      className="transition-transform"
    />
  ) : (
    ...
  )}
</div>
```

Para:
```tsx
<div 
  className="relative bg-muted rounded-lg flex items-center justify-center"
  style={{ 
    height: "calc(60vh - 100px)",  // Altura baseada na viewport
    minHeight: "300px",
    maxHeight: "500px",
    overflow: zoom > 100 ? "auto" : "hidden"  // Scroll apenas quando zoom > 100%
  }}
>
  {exam.images[selectedImageIndex] ? (
    <img
      src={exam.images[selectedImageIndex].image_url}
      alt="Exam"
      style={{ 
        maxWidth: zoom === 100 ? "100%" : `${zoom}%`,
        maxHeight: zoom === 100 ? "100%" : `${zoom}%`,
        objectFit: "contain",  // Mantém proporção e definição
        transition: "all 0.2s ease"
      }}
      className="rounded"
    />
  ) : (
    ...
  )}
</div>
```

---

### Comportamento Esperado

1. **Zoom 100% (padrão)**: A imagem se ajusta automaticamente ao container, exibindo-se por inteiro sem rolagem
2. **Zoom > 100%**: A imagem aumenta e aparece scrollbar para navegar
3. **Zoom < 100%**: A imagem diminui proporcionalmente

```text
+------------------------------------------+
|           Imagem do Exame                |
|  [zoom controls]           [-] 100% [+]  |
| +--------------------------------------+ |
| |                                      | |
| |   [Imagem ajustada ao container]     | |
| |   (sem necessidade de scroll)        | |
| |                                      | |
| +--------------------------------------+ |
+------------------------------------------+
```

### Vantagens
- Imagem visível por inteiro ao carregar a página
- Mantém definição usando `object-fit: contain`
- Altura responsiva baseada na viewport (`60vh`)
- Funcionalidade de zoom preservada para análise detalhada

