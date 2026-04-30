/**
 * Retenção no checkout — estado só no navegador (sessionStorage), por aba.
 * Não substitui validação no servidor em produção; é UX + exibição do total.
 */

export const RETENTION_ROUTE = "/checkout/retencao" as const;

const K = {
  /** Utilizador abriu `/checkout` nesta aba — ativa BackRedirect na landing só depois disto. */
  visitedCheckout: "ab_chk_visited_sess_v1",
  /** Usuário já consumiu a interceptação nesta sessão (subir versão zera estado antigo de testes). */
  sawRetention: "ab_chk_ret_exit_v4",
  /** Próximo carregamento de /checkout/retencao veio do Voltar/checkout (consome ao montar a página). */
  pendingFromCheckout: "ab_chk_ret_from_chk_v4",
  /** Prazo final da oferta na página de retenção (timestamp ms). */
  deadlineMs: "ab_chk_ret_deadline",
  /** Desconto de 30% aceito; válido até este timestamp (mesmo fim dos 10 min). */
  discountUntilMs: "ab_chk_ret_disc_until",
} as const;

const TEN_MIN_MS = 10 * 60 * 1000;
export const RETENTION_PERCENT = 30;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Marca que o utilizador entrou no checkout nesta sessão (sessionStorage por aba). */
export function flagCheckoutVisitedThisSession() {
  safeSet(K.visitedCheckout, "1");
}

/** true se já abriu `/checkout` nesta aba — usado pela landing para só então aplicar interceptação ao «voltar». */
export function hasVisitedCheckoutThisSession(): boolean {
  return safeGet(K.visitedCheckout) === "1";
}

/** Desconto de retenção ainda dentro do prazo (aceite recente) — não mostrar interceptação de novo no checkout. */
export function isRetentionDiscountPeriodActive(): boolean {
  const raw = safeGet(K.discountUntilMs);
  if (!raw) return false;
  const untilMs = parseInt(raw, 10);
  if (!Number.isFinite(untilMs) || Date.now() >= untilMs) {
    clearRetentionDiscount();
    return false;
  }
  return true;
}

/** Já exibimos a oferta de retenção nesta sessão — não interceptar saída de novo. */
export function hasSeenRetentionOffer(): boolean {
  return safeGet(K.sawRetention) === "1";
}

/** Marca que o usuário já viu a página de retenção (uma vez por sessão). */
export function markRetentionOfferSeen() {
  safeSet(K.sawRetention, "1");
}

/** Chamado ao sair do checkout em direção à retencão (Voltar ou botão voltar do browser). */
export function flagRetentionNavigationFromCheckout() {
  safeSet(K.pendingFromCheckout, "1");
}

/**
 * Ao montar `/checkout/retencao`: se a navegação veio do checkout, marca "já mostramos" aqui
 * (evita marcar no clique antes do `router.push`, que podia causar segunda ida a `/`).
 */
export function tryCommitRetentionVisitFromCheckout() {
  if (safeGet(K.pendingFromCheckout) !== "1") return;
  safeRemove(K.pendingFromCheckout);
  markRetentionOfferSeen();
}

/** URL da página de retenção (com query opcional, sem `?` inicial). */
export function getRetentionHref(queryWithoutQuestionMark: string): string {
  return queryWithoutQuestionMark.length > 0
    ? `${RETENTION_ROUTE}?${queryWithoutQuestionMark}`
    : RETENTION_ROUTE;
}

/** Inicia ou devolve o prazo dos 10 minutos (ao abrir a página de retenção). */
export function getOrInitRetentionDeadline(): number {
  const raw = safeGet(K.deadlineMs);
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  const until = Date.now() + TEN_MIN_MS;
  safeSet(K.deadlineMs, String(until));
  return until;
}

/** Limpa prazo da página (ex.: ao recusar). */
export function clearRetentionDeadline() {
  safeRemove(K.deadlineMs);
}

/** Usuário aceitou o 30% — válido até `untilMs` (normalmente o fim dos 10 min). */
export function setRetentionDiscountAccepted(untilMs: number) {
  safeSet(K.discountUntilMs, String(untilMs));
}

export function clearRetentionDiscount() {
  safeRemove(K.discountUntilMs);
}

/** Desconto ativo agora? (e remove se expirou) */
export function getActiveRetentionDiscountCents(baseTotalCents: number): {
  active: boolean;
  discountCents: number;
  untilMs: number | null;
} {
  const raw = safeGet(K.discountUntilMs);
  if (!raw) return { active: false, discountCents: 0, untilMs: null };
  const untilMs = parseInt(raw, 10);
  if (!Number.isFinite(untilMs) || Date.now() >= untilMs) {
    clearRetentionDiscount();
    return { active: false, discountCents: 0, untilMs: null };
  }
  const discountCents = Math.round((baseTotalCents * RETENTION_PERCENT) / 100);
  return { active: true, discountCents, untilMs };
}

export function msLeftForDiscount(untilMs: number | null): number {
  if (untilMs == null) return 0;
  return Math.max(0, untilMs - Date.now());
}
