/**
 * Segredo opcional do webhook Pix (Royal Banking Cash In).
 * Mantém-se o nome `getMangofyWebhookSecret` por compatibilidade com o handler existente.
 */
export function getMangofyWebhookSecret(): string | undefined {
  return (
    process.env.ROYALBANKING_WEBHOOK_SECRET?.trim() ||
    process.env.MANGOFY_WEBHOOK_SECRET?.trim() ||
    undefined
  );
}
