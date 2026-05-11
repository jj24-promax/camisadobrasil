/**
 * Segredo opcional do webhook Pix Cash In (Royal Banking).
 * Se vazio, o handler aceita o POST sem validar assinatura (não recomendado em produção).
 */
export function getPixWebhookSecret(): string | undefined {
  return process.env.ROYALBANKING_WEBHOOK_SECRET?.trim() || undefined;
}
