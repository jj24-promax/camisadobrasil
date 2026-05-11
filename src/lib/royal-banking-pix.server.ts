import "server-only";

import { absoluteUrl } from "@/lib/site-url";
import { getMinCheckoutAmountBrl } from "@/lib/checkout-min-amount-cents";
import {
  extractPixGatewayPayload,
  humanizePixGatewayError,
} from "@/lib/pix-gateway-response";

const ROYAL_GATEWAY_URL = "https://api.royalbanking.com.br/v1/gateway/";

export type RoyalPixClientInput = {
  name: string;
  documentDigits: string;
  telefoneDigits: string;
  email: string;
};

export function getRoyalBankingApiKey(): string | undefined {
  return process.env.ROYALBANKING_API_KEY?.trim() || undefined;
}

/** URL absoluta do webhook Pix (Cash In) — Royal Banking `callbackUrl`. */
export function getRoyalBankingPixCallbackUrl(): string {
  const explicit = process.env.ROYALBANKING_PIX_CALLBACK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const siteUrl =
    process.env.SITE_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (siteUrl) {
    const base = siteUrl.replace(/\/$/, "");
    return `${base}/api/webhooks/royalbanking/pix`;
  }
  return absoluteUrl("/api/webhooks/royalbanking/pix");
}

export async function createRoyalBankingPixCashIn(args: {
  amountBrl: number;
  client: RoyalPixClientInput;
}): Promise<
  | {
      ok: true;
      paymentCode: string;
      paymentCodeBase64: string;
      idTransaction: string;
    }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const apiKey = getRoyalBankingApiKey();
  if (!apiKey) {
    return { ok: false, status: 500, message: "ROYALBANKING_API_KEY não configurada no servidor." };
  }

  const amount = Number(args.amountBrl.toFixed(2));
  const minBrl = getMinCheckoutAmountBrl();
  if (!Number.isFinite(amount) || amount < minBrl) {
    return { ok: false, status: 400, message: "Valor do Pix inválido." };
  }

  const callbackUrl = getRoyalBankingPixCallbackUrl();
  const c = args.client;

  const upstream = await fetch(ROYAL_GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "api-key": apiKey,
      amount,
      client: {
        name: c.name.trim().slice(0, 150),
        document: c.documentDigits.replace(/\D/g, ""),
        telefone: c.telefoneDigits.replace(/\D/g, ""),
        email: c.email.trim().toLowerCase().slice(0, 150),
      },
      callbackUrl,
    }),
  });

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return { ok: false, status: 502, message: "Resposta inválida da Royal Banking." };
  }

  if (!upstream.ok) {
    const human = humanizePixGatewayError(data);
    const msg =
      human ||
      (typeof data === "object" && data !== null && "message" in data && typeof (data as { message?: unknown }).message === "string"
        ? String((data as { message: string }).message)
        : `Falha ao gerar Pix (${upstream.status}).`);
    return { ok: false, status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, message: msg, raw: data };
  }

  const flat =
    data && typeof data === "object" && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>) }
      : {};
  const nested = flat.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    Object.assign(flat, nested as Record<string, unknown>);
  }

  const gw = extractPixGatewayPayload(flat);
  const idTransaction = gw.idTransaction?.trim() ?? "";
  if (!idTransaction) {
    return { ok: false, status: 502, message: "Pix gerado sem id de transação. Contacte o suporte.", raw: data };
  }

  return {
    ok: true,
    paymentCode: gw.paymentCode || String((flat as { copyPaste?: string }).copyPaste ?? "").trim(),
    paymentCodeBase64: gw.paymentCodeBase64,
    idTransaction,
  };
}
