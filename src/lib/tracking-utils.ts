export type { TrackingEvent } from "@/utils/tracking";
export { generateTimeline } from "@/utils/tracking";

/**
 * Gera um código de rastreio seguindo o padrão:
 * BR + 4 números + 1 letra + 3 números + BR
 */
export function generateMockTrackingCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const num4 = Math.floor(1000 + Math.random() * 9000).toString();
  const char = letters.charAt(Math.floor(Math.random() * letters.length));
  const num3 = Math.floor(100 + Math.random() * 900).toString();
  return `BR${num4}${char}${num3}BR`;
}
