# Royal Banking — Pix Cash In (depósito)

Integração de **solicitação de depósito** via API Pix (Cash In).

> **Segurança:** nunca commites `api-key` real. Usa variáveis de ambiente no servidor.

## Endpoint

| Item        | Valor |
|------------|--------|
| **URL**    | `https://api.royalbanking.com.br/v1/gateway/` |
| **Método** | `POST` |
| **Corpo**  | JSON (`Content-Type: application/json`) |

## Parâmetros obrigatórios

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `api-key` | string | Sim | Chave de API fornecida pela Royal Banking. |
| `amount` | number | Sim | Valor em **reais** (ex.: `100` = R$ 100,00). |
| `client.name` | string | Sim | Nome completo do cliente. |
| `client.document` | string | Sim | CPF **somente dígitos** (ex.: `12345678911`). |
| `client.telefone` | string | Sim | Telefone **somente dígitos** (ex.: `11999999999`). |
| `client.email` | string | Sim | E-mail do cliente. |
| `callbackUrl` | string | Sim | URL do **webhook** para notificações de status do pagamento. |

## Parâmetros opcionais

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `split.email` | string | Não | Usuário do split (ex.: `@teste123`). |
| `split.percentage` | string | Não | Percentual de divisão (ex.: `"10"` = 10%). |

## Exemplo de requisição

```http
POST /v1/gateway/ HTTP/1.1
Host: api.royalbanking.com.br
Content-Type: application/json
```

```json
{
  "api-key": "<SUA_API_KEY>",
  "amount": 100,
  "client": {
    "name": "Maria Oliveira",
    "document": "12345678911",
    "telefone": "11999999999",
    "email": "maria.oliveira@email.com"
  },
  "split": {
    "email": "@Teste002",
    "percentage": "50"
  },
  "callbackUrl": "https://exemplo.com/royalbanking/callback"
}
```

## Resposta de sucesso (200 OK)

```json
{
  "status": "success",
  "message": "ok",
  "paymentCode": "00020101021226790014br.gov.bcb.pix2554...",
  "idTransaction": "52fc5262-4063-4900-933b-55e69850",
  "paymentCodeBase64": "iVBORw0KGgoAAAANSUhEUgAAAPoAAAD6AQAAAACgl2eQAAACwElEQVR4Xu2XS5IjIQwF4SJw/1vMUeAi..."
}
```

| Campo | Descrição |
|-------|-----------|
| `paymentCode` | Payload EMV / copia-e-cola do Pix. |
| `idTransaction` | Identificador da transação no gateway. |
| `paymentCodeBase64` | QR Code em imagem (Base64), quando aplicável. |

## Códigos HTTP (referência)

| Código | Uso típico |
|--------|------------|
| **200** | Pix gerado com sucesso. |
| **400** | Dados inválidos: campos obrigatórios ausentes ou valores fora do permitido. |
| **401** | Não autorizado: `api-key` inválida ou IP não autorizado. |
| **405** | Método não permitido (esperado `POST`). *Na documentação original constava 200 — convém confirmar com o suporte Royal Banking.* |
| **500** | Erro interno no processamento. |

## Webhook (`callbackUrl`)

O checkout Next gera o Pix no **servidor** (Royal Banking) e envia `callbackUrl` típico **`POST https://seudominio.com/api/webhooks/royalbanking/pix`**. O `next.config.ts` reescreve **`/api/webhooks/mangofy/pix`** para o mesmo handler (URLs antigas). Quando o payload é **pago** (`src/lib/pix-webhook-parse.ts` → `parsePixCashInWebhook`), grava-se `status = paid` em `pix_gateway_payments` e atualiza-se `vendas` (Supabase, **service role**).

1. Na Vercel: `SUPABASE_SERVICE_ROLE_KEY` + SQL em `docs/supabase-pix-payments.sql`.
2. Segredo opcional: `ROYALBANKING_WEBHOOK_SECRET`; headers aceites: `x-webhook-secret`, `x-royal-webhook-secret`, `Authorization: Bearer …` (ver `src/app/api/webhooks/royalbanking/pix/route.ts`).
3. Se o webhook tiver outro formato, ajusta o parser em `pix-webhook-parse.ts` para detetar `idTransaction` e estado pago.

## Onde colocar a API Key (este projeto Next.js)

1. **Não** coloques a chave no código nem em `NEXT_PUBLIC_*` (isso ia para o browser).
2. Cria **`.env.local`** a partir de **`.env.example`**:
   - **`ROYALBANKING_API_KEY`** e opcionalmente **`ROYALBANKING_PIX_CALLBACK_URL`** (URL completa do webhook se quiseres forçar).
   - Webhook público HTTPS: `https://seudominio.com/api/webhooks/royalbanking/pix`  
     Em desenvolvimento local o gateway não consegue chamar `localhost`; usa **túnel** (ngrok, Cloudflare Tunnel, etc.) ou testa webhook só em staging/produção.
3. O checkout usa **`POST /api/checkout/pix-create`**: chama `https://api.royalbanking.com.br/v1/gateway/` no servidor e devolve ao browser só o QR/código (**sem** `api-key`).

## Notas de implementação (checkout)

- Chamar a API **apenas no servidor** (Route Handler, server action ou backend próprio): evita expor `api-key` no browser.
- Validar CPF, e-mail e telefone antes de enviar.
- Guardar `idTransaction` associado ao pedido para conciliar com o webhook.
