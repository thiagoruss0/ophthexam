

# Plano: Aprovar e Tornar Admin o Usuário

## Dados do Usuário Encontrado

| Campo | Valor |
|-------|-------|
| Email | benaion.thiago@gmail.com |
| Nome | Thiago Russo |
| CRM | 6222/AM |
| Status Atual | pending |
| User ID | 16481ed3-7bf1-4a74-ae16-30f3a4799393 |
| Profile ID | 1cdba824-4399-475a-a728-7edd0b8d20c5 |

---

## Ações Necessárias

### 1. Aprovar o Perfil
Atualizar o status do perfil de "pending" para "approved".

### 2. Adicionar Papel de Admin
Inserir registro na tabela `user_roles` com o papel "admin".

---

## Queries SQL a Executar

As seguintes queries serão executadas no banco de dados:

```sql
-- 1. Aprovar o perfil do usuário
UPDATE profiles 
SET status = 'approved', updated_at = now() 
WHERE user_id = '16481ed3-7bf1-4a74-ae16-30f3a4799393';

-- 2. Adicionar papel de admin
INSERT INTO user_roles (user_id, role) 
VALUES ('16481ed3-7bf1-4a74-ae16-30f3a4799393', 'admin');
```

---

## Resultado Esperado

Após a execução:
- O usuário será redirecionado automaticamente para o Dashboard (a página atual `/aguardando-aprovacao` detectará a mudança de status)
- O menu Admin aparecerá na navegação
- O usuário terá acesso total ao painel administrativo para gerenciar outros médicos

---

## Implementação

Quando você aprovar este plano, vou executar as queries acima para:
1. Aprovar a conta
2. Conceder privilégios de administrador

