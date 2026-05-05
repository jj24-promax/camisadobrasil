/**
 * Segredo opcional do webhook Pix (Mangofy / gateway).
 * `ROYALBANKING_*` mantém-se como fallback para ambientes já configurados.
 */
export function getMangofyWebhookSecret(): string | undefined {
  return (
    process.env.MANGOFY_WEBHOOK_SECRET?.trim() ||
    process.env.ROYALBANKING_WEBHOOK_SECRET?.trim() ||
    undefined
  );
}
