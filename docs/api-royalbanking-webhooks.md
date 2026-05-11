# Royal Banking — Webhooks (Pix Cash In / Cash Out)

## Checklist — ligar o webhook ao dashboard (este projeto)

1. **URL pública HTTPS** do teu site na Vercel (ou domínio final), por exemplo:  
   `https://teu-dominio.com/api/webhooks/royalbanking/pix`  
   - O **Cash In** usa o `callbackUrl` enviado em cada criação de Pix (`royal-banking-pix.server.ts` → `SITE_URL` / `APP_URL` / `ROYALBANKING_PIX_CALLBACK_URL`). Garante na **Vercel** `SITE_URL` ou `APP_URL` correto (sem barra no fim).  
   - **Cash Out** (se usares): URL configurada no **painel Royal** — só aponta para o mesmo path se quiseres um único endpoint; o código **ignora** saques para não mexer em vendas de checkout.

2. **Variáveis na Vercel** (Environment Variables):  
   - `SUPABASE_SERVICE_ROLE_KEY` — obrigatória para gravar `pix_gateway_payments` e atualizar `vendas`.  
   - `ROYALBANKING_WEBHOOK_SECRET` — **opcional**. Se definires, a Royal tem de enviar o **mesmo** valor num destes headers: `x-webhook-secret`, `x-royal-webhook-secret` ou `Authorization: Bearer …`. Se não enviarem, **remove** o segredo na Vercel para testar.

3. **Supabase (SQL já no repo)** — executa no SQL Editor se ainda não fizeste:  
   - `docs/supabase-pix-payments.sql`  
   - `docs/supabase-vendas-pix.sql`  
   - `docs/supabase-order-details.sql` (`detalhes_pedido` em `vendas`)

4. **Deploy** — faz deploy na Vercel depois de alterar env; gera um **Pix novo** no checkout para o `callbackUrl` bater no URL atual.

5. **Resposta do servidor** — este projeto responde **`HTTP 200`** com corpo JSON **`200`** (número), como a Royal pede. Vê `src/lib/royal-banking-webhook-response.ts` e `src/app/api/webhooks/royalbanking/pix/route.ts`.

6. **Logs** — na Vercel → projeto → **Logs**, filtra `royal/webhook` ou `POST /api/webhooks/royalbanking/pix` para ver `cash-in pago`, `ack — evento ignorado`, etc.

---

Os webhooks permitem que o teu sistema receba **notificações automáticas** quando há mudança de estado em:

- **Pix Cash In** (depósito) — URL: `callbackUrl` enviada na requisição de cash in.
- **Pix Cash Out** (saque) — URL configurada no **painel** Royal Banking.

> Confirma com o suporte os **nomes exatos dos campos** (`idTransaction` vs `externalReference`): os exemplos abaixo misturam as duas convenções.

---

## Webhook — Pix pago (Cash In)

Disparado quando o depósito Pix é **confirmado como pago**.

### Exemplo de payload (JSON)

```json
{
  "idTransaction": "81bb141a-1746-49a8-bb4a-c3b8aa0d2259",
  "status": "paid"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `idTransaction` ou `externalReference` | string | Identificador único da transação (alinhado ao retorno do cash in). |
| `status` | string | `paid` — Pix pago com sucesso. |

---

## Webhook — Saque pago (Cash Out)

Disparado quando o saque Pix é **concluído com sucesso** no painel Royal Banking.

### Exemplo de payload (JSON)

```json
{
  "idTransaction": "exemplo34243243",
  "status": "paid"
}
```

Na documentação original, o estado de sucesso do saque é descrito como **`SaquePago`**, enquanto o exemplo acima usa **`paid`**. **Valida qual valor a API envia** em produção.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `idTransaction` ou `externalReference` | string | ID da transação de saque. |
| `status` | string | Sucesso: `paid` *(exemplo)* ou `SaquePago` *(texto descritivo)* — confirmar. |

---

## Webhook — Saque falhou (Cash Out)

Enviado quando o saque **não pôde ser concluído** (saldo insuficiente, conta inválida, etc.).

### Exemplo de payload (JSON)

```json
{
  "externalReference": "exemplo34243243",
  "status": "SaqueFalhou"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `externalReference` | string | ID da transação de saque que falhou. |
| `status` | string | `SaqueFalhou` — erro ou rejeição no saque. |

---

## Tratamento no teu servidor

1. **Responder depressa** com **HTTP 200 OK**. Este projeto devolve corpo JSON **`200`** (número), como `json_encode(200)` em PHP.
2. Em paralelo grava em `pix_gateway_payments` e atualiza **`vendas`** para `status` pago quando o Cash In confirma (`idTransaction` / `externalReference` + `paid`). Requer `docs/supabase-pix-payments.sql`, `docs/supabase-vendas-pix.sql` e `SUPABASE_SERVICE_ROLE_KEY`.
3. **Idempotência:** o mesmo evento pode ser entregue **várias vezes**. Se não responderes **200** como esperado, a plataforma **reenvia até 3 vezes** (total de tentativas conforme manual).
4. **Persistência:** guarda `idTransaction` / `externalReference` e atualiza o estado do pedido na base de dados **após** validar o payload (e assinatura, se existir).
5. **Processamento pesado** (e-mails, filas): faz em **background** depois de responder 200, para não expirar o timeout do webhook.

---

## Resumo de estados (`status`)

| Cenário | Valor típico em `status` | Descrição |
|---------|---------------------------|-----------|
| Cash In pago | `paid` | Depósito Pix confirmado. |
| Cash Out pago | `paid` ou `SaquePago` | Saque concluído — **confirmar valor real**. |
| Cash Out falhou | `SaqueFalhou` | Saque não concluído. |

---

## Documentação relacionada

- `docs/api-royalbanking-pix-cashin.md` — `callbackUrl` (Cash In).
- `docs/api-royalbanking-pix-cashout.md` — `postbackUrl` / painel (Cash Out).
- `docs/api-royalbanking-pix-med.md` — MED (`refund_approved`).
- `docs/api-royalbanking-pix-failed.md` — Pix cancelado (`canceled`).
