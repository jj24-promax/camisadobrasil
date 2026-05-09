import type { Size } from "@/lib/types";

export type SizeGuideRow = {
  size: Size;
  bustMin: number;
  bustMax: number;
  lengthLabel: string;
  shoulderLabel: string;
  /** Intervalo exibido na tabela (texto) */
  bustDisplay: string;
};

/** Faixas alinhadas à tabela do site; em empate no limite, recomenda-se o maior (caimento mais solto). */
export const SIZE_GUIDE_ROWS: readonly SizeGuideRow[] = [
  { size: "P", bustMin: 92, bustMax: 96, lengthLabel: "68–70", shoulderLabel: "42–44", bustDisplay: "92–96" },
  { size: "M", bustMin: 96, bustMax: 100, lengthLabel: "70–72", shoulderLabel: "44–46", bustDisplay: "96–100" },
  { size: "G", bustMin: 100, bustMax: 106, lengthLabel: "72–74", shoulderLabel: "46–48", bustDisplay: "100–106" },
  { size: "GG", bustMin: 106, bustMax: 112, lengthLabel: "74–76", shoulderLabel: "48–50", bustDisplay: "106–112" },
  { size: "G1", bustMin: 112, bustMax: 118, lengthLabel: "76–78", shoulderLabel: "50–52", bustDisplay: "112–118" },
  { size: "G2", bustMin: 118, bustMax: 124, lengthLabel: "78–80", shoulderLabel: "52–54", bustDisplay: "118–124" },
  { size: "G3", bustMin: 124, bustMax: 132, lengthLabel: "80–82", shoulderLabel: "54–56", bustDisplay: "124–132" },
  { size: "G4", bustMin: 132, bustMax: 142, lengthLabel: "82–84", shoulderLabel: "56–58", bustDisplay: "132–142" },
] as const;

export function recommendSizeFromBustCm(bust: number): { size: Size; ambiguous: boolean } | null {
  if (!Number.isFinite(bust)) return null;
  const first = SIZE_GUIDE_ROWS[0];
  const last = SIZE_GUIDE_ROWS[SIZE_GUIDE_ROWS.length - 1];
  if (bust < first.bustMin) return { size: first.size, ambiguous: false };
  if (bust > last.bustMax) return { size: last.size, ambiguous: false };

  const matches = SIZE_GUIDE_ROWS.filter((r) => bust >= r.bustMin && bust <= r.bustMax);
  if (matches.length === 0) return null;
  if (matches.length === 1) return { size: matches[0].size, ambiguous: false };
  return { size: matches[matches.length - 1].size, ambiguous: true };
}
