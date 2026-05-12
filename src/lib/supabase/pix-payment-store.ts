import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";

const TABLE = "pix_gateway_payments";

export function canPersistPixPaymentStatus(): boolean {
  return createSupabaseAdminClient() != null;
}

export async function markPixGatewayPaymentPaid(
  idTransaction: string,
  rawPayload: unknown
): Promise<{ ok: boolean; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
  }

  const rawJson =
    rawPayload !== null && typeof rawPayload === "object"
      ? (rawPayload as Record<string, unknown>)
      : { value: rawPayload };

  const { error } = await admin.from(TABLE).upsert(
    {
      id_transaction: id,
      status: "paid",
      raw_payload: rawJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id_transaction" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function markPixGatewayPaymentFailed(
  idTransaction: string,
  rawPayload: unknown
): Promise<{ ok: boolean; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
  }

  const rawJson =
    rawPayload !== null && typeof rawPayload === "object"
      ? (rawPayload as Record<string, unknown>)
      : { value: rawPayload };

  const { error } = await admin.from(TABLE).upsert(
    {
      id_transaction: id,
      status: "failed",
      raw_payload: rawJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id_transaction" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function isPixGatewayPaymentPaid(idTransaction: string): Promise<boolean> {
  const id = idTransaction.trim();
  if (!id) return false;

  const admin = createSupabaseAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from(TABLE)
    .select("id_transaction, status")
    .eq("id_transaction", id)
    .maybeSingle();

  if (error || !data) return false;
  return isPixGatewayPaidDbStatus((data as Record<string, unknown>).status);
}