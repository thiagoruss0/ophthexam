
# Plano de Correção: BUG-002 - Busca Server-Side no Histórico

## Problema Identificado

A busca por nome de paciente está sendo feita **client-side** após a paginação server-side, causando falhas quando o paciente buscado não está na página atual.

```text
+-------------------+     +------------------+     +----------------+
|  Servidor         |     |  Cliente         |     |  Problema      |
+-------------------+     +------------------+     +----------------+
| Retorna página 3  | --> | Filtra por nome  | --> | Paciente na    |
| (20 registros)    |     | nos 20 registros |     | página 1 não   |
|                   |     |                  |     | é encontrado   |
+-------------------+     +------------------+     +----------------+
```

## Solução Proposta

Implementar busca em duas etapas:
1. Quando houver termo de busca, primeiro consultar a tabela `patients` para obter IDs correspondentes
2. Usar esses IDs para filtrar a consulta de `exams` no servidor

```text
+-------------------+     +------------------+     +----------------+
|  Busca Pacientes  |     |  Filtra Exames   |     |  Resultado     |
+-------------------+     +------------------+     +----------------+
| SELECT id FROM    | --> | .in('patient_id',| --> | Paginação      |
| patients WHERE    |     |   patientIds)    |     | correta com    |
| name ILIKE '%X%'  |     |                  |     | busca aplicada |
+-------------------+     +------------------+     +----------------+
```

## Implementação

### Arquivo: `src/pages/History.tsx`

#### 1. Adicionar debounce na busca
Para evitar requisições excessivas durante a digitação:
- Criar estado `debouncedSearch` 
- Implementar `useEffect` com `setTimeout` de 300ms
- Usar `debouncedSearch` nas queries ao invés de `search`

#### 2. Resetar página ao buscar
Quando o termo de busca mudar:
- Resetar `page` para 1
- Evitar que o usuário fique em uma página vazia

#### 3. Modificar `fetchExams()` para busca server-side
Nova lógica:
```
SE debouncedSearch não está vazio:
  1. Consultar tabela 'patients' com ILIKE no nome
  2. Extrair lista de patient_ids
  3. SE nenhum paciente encontrado: retornar lista vazia
  4. Adicionar filtro .in('patient_id', patientIds) na query de exams
  
Continuar com query normal de exams (tipo, status, datas, paginação)
```

#### 4. Aplicar mesma lógica em `handleExportCsv()`
Garantir que exportação CSV também use busca server-side para consistência.

#### 5. Remover filtro client-side
Eliminar o código que fazia `filteredData.filter()` após receber dados do servidor.

## Detalhes Técnicos

### Query de pacientes (nova)
```typescript
const { data: matchingPatients } = await supabase
  .from("patients")
  .select("id")
  .eq("created_by", profile.id)
  .ilike("name", `%${debouncedSearch}%`);
```

### Filtro na query de exams (modificação)
```typescript
if (patientIds && patientIds.length > 0) {
  query = query.in("patient_id", patientIds);
}
```

### Debounce implementation
```typescript
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
  }, 300);
  return () => clearTimeout(timer);
}, [search]);
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Busca | Client-side (20 registros) | Server-side (todos) |
| Paginação | Incorreta com busca | Correta com busca |
| Performance | UX ruim em grandes volumes | Escalável |
| Consistência | Busca e export diferentes | Mesma lógica |

## Testes Recomendados

1. Cadastrar 50+ exames com pacientes diferentes
2. Navegar até página 3
3. Buscar por paciente que está na página 1
4. Verificar que o paciente é encontrado
5. Testar exportação CSV com busca ativa
6. Verificar debounce (não deve fazer request a cada tecla)
