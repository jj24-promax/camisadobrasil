import "server-only";

const SENSITIVE_KEY_RE =
  /email|e-mail|mail|cpf|cnpj|document|phone|telefone|tel|celular|address|endereco|street|cep|bairro|complement|token|authorization|secret|password|senha|holder|nome_completo|full_name/i;

/** Ativar logs verbosos do webhook Pix: `DEBUG_PIX_WEBHOOK=1` (Vercel / .env.local). */
export function isPixWebhookDebugEnabled(): boolean {
  return process.env.DEBUG_PIX_WEBHOOK === "1";
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]";
  if (value == null) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length > 120) return `${t.slice(0, 120)}…`;
    return t;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((x) => sanitizeForLog(x, depth + 1));
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = sanitizeForLog(v, depth + 1);
  }
  return out;
}

export function pixWebhookDebugLog(phase: string, data: Record<string, unknown>): void {
  if (!isPixWebhookDebugEnabled()) return;
  console.log(`[WEBHOOK_PIX_DEBUG] ${phase}`, sanitizeForLog(data) as Record<string, unknown>);
}
