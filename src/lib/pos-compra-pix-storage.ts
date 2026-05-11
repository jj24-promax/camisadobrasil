/**
 * Referência opaca (leadId) e snapshot do cliente para Pix pós-compra,
 * guardado em sessionStorage (sem expor dados desnecessários).
 */

const STORAGE_KEY = "alpha_pos_compra_pix_client_v3";

export type PixCheckoutCustomerSnapshot = {
  name: string;
  email: string;
  phoneDigits: string;
  docDigits: string;
  cep: string;
  street: string;
  city: string;
  state: string;
};

export type PosCompraPixClient = {
  leadId?: string;
  mainVendaId?: string;
  pixCustomer?: PixCheckoutCustomerSnapshot;
};

function validPixCustomerSnapshot(v: unknown): v is PixCheckoutCustomerSnapshot {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const req = ["name", "email", "phoneDigits", "docDigits", "cep", "street", "city", "state"] as const;
  for (const k of req) {
    if (typeof o[k] !== "string" || !String(o[k]).trim()) return false;
  }
  return true;
}

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

    let leadId: string | undefined;
    if (typeof o.leadId === "string" && o.leadId.trim()) {
      leadId = o.leadId.trim();
    }

    let mainVendaId: string | undefined;
    if (typeof o.mainVendaId === "string" && o.mainVendaId.trim()) {
      mainVendaId = o.mainVendaId.trim();
    }

    const rawSnap = o.pixCustomer;

    let pixCustomer: PixCheckoutCustomerSnapshot | undefined;
    if (validPixCustomerSnapshot(rawSnap)) {
      const m = rawSnap;
      pixCustomer = {
        name: m.name.trim(),
        email: m.email.trim().toLowerCase(),
        phoneDigits: m.phoneDigits.replace(/\D/g, ""),
        docDigits: m.docDigits.replace(/\D/g, ""),
        cep: m.cep.replace(/\D/g, ""),
        street: m.street.trim(),
        city: m.city.trim(),
        state: m.state.replace(/\s/g, "").toUpperCase().slice(0, 2),
      };
    }

    if (!leadId && !pixCustomer) return null;
    return { leadId, mainVendaId, pixCustomer };
  } catch {
    return null;
  }
}
