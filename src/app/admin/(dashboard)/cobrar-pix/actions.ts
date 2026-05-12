"use server";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import {
  computeCollectPixTotalCents,
  normalizeCollectPixCart,
  type CollectPixCart,
} from "@/lib/admin/collect-pix-pricing";
import { getMinCheckoutAmountCents } from "@/lib/checkout-min-amount-cents";
import { createRoyalBankingPixCashIn } from "@/lib/royal-banking-pix.server";

export type CreateAdminCollectPixInput = {
  customerName: string;
  email: string;
  phone: string;
  cpf: string;
  cart: CollectPixCart;
};

export type CreateAdminCollectPixResult =
  | {
      ok: true;
      paymentCode: string;
      paymentCodeBase64: string;
      gatewayTransactionId: string;
      totalCents: number;
      summaryParts: string[];
    }
  | { ok: false; error: string };

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function createAdminCollectPixAction(input: CreateAdminCollectPixInput): Promise<CreateAdminCollectPixResult> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const name = String(input.customerName ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = digitsOnly(String(input.phone ?? ""));
  const cpf = digitsOnly(String(input.cpf ?? ""));

  if (!name || name.length > 200) {
    return { ok: false, error: "Informe o nome do cliente." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (phone.length < 10 || phone.length > 13) {
    return { ok: false, error: "Telefone inválido (mín. 10 dígitos)." };
  }
  if (cpf.length !== 11 && cpf.length !== 14) {
    return { ok: false, error: "CPF ou CNPJ inválido (11 ou 14 dígitos)." };
  }

  const cart = normalizeCollectPixCart(input.cart);
  const { totalCents, summaryParts } = computeCollectPixTotalCents(cart);

  const minCents = getMinCheckoutAmountCents();
  if (totalCents < minCents) {
    return { ok: false, error: `Montante abaixo do mínimo permitido (${(minCents / 100).toFixed(2).replace(".", ",")}). Ajuste as quantidades.` };
  }
  if (totalCents > 50_000_000) {
    return { ok: false, error: "Valor total acima do limite permitido." };
  }

  const amountBrl = Number((totalCents / 100).toFixed(2));
  const royal = await createRoyalBankingPixCashIn({
    amountBrl,
    client: {
      name,
      documentDigits: cpf,
      telefoneDigits: phone,
      email,
    },
  });

  if (!royal.ok) {
    return { ok: false, error: royal.message };
  }

  return {
    ok: true,
    paymentCode: royal.paymentCode,
    paymentCodeBase64: royal.paymentCodeBase64,
    gatewayTransactionId: royal.idTransaction,
    totalCents,
    summaryParts,
  };
}
