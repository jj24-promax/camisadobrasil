/**
 * Guardamos apenas a referência opaca (leadId) para evitar a exposição
 * de dados sensíveis (PII) em caso de XSS no front-end.
 */

const STORAGE_KEY = "alpha_pos_compra_pix_client_v2";

export type PosCompraPixClient = {
  leadId: string;
};

export function savePosCompraPixClient(c: PosCompraPixClient): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* quota / private mode */
  }
}

export function readPosCompraPixClient(): PosCompraPixClient | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.leadId !== "string" || !o.leadId) return null;
    return { leadId: o.leadId };
  } catch {
    return null;
  }
}