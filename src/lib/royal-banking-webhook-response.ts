import { NextResponse } from "next/server";

/**
 * Confirmação exigida pela Royal Banking: HTTP 200 com corpo JSON numérico `200`
 * (equivalente a `json_encode(200)` em PHP). Sem isto, a plataforma reenvia o webhook.
 *
 * @see docs/api-royalbanking-webhooks.md
 */
export function royalBankingWebhookAck(): NextResponse {
  return NextResponse.json(200, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
