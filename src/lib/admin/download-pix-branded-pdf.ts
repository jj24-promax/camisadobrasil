import { qrDataUrlForImg } from "@/lib/pix-gateway-response";

export type PixBrandedPdfInput = {
  leadName: string;
  pixCode: string;
  /** Base64 puro ou data URL — mesmo formato usado no checkout (QR Pix) */
  qrImageRaw?: string;
  /** Linhas de resumo do pedido (ex.: produtos × quantidade). */
  orderSummaryLines?: string[];
  /** Total já formatado em BRL (ex.: `R$ 135,80`). */
  totalFormatted?: string;
};

async function svgLogoToPngDataUrl(): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const res = await fetch(`${window.location.origin}/images/brand/alpha-brasil-logo.svg`, { cache: "force-cache" });
    if (!res.ok) return null;
    const svg = await res.text();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.decoding = "async";
    const dataUrl = await new Promise<string | null>((resolve) => {
      img.onload = () => {
        try {
          const w = 320;
          const h = 72;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
    return dataUrl;
  } catch {
    return null;
  }
}

function pdfImageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.includes("image/jpeg")) return "JPEG";
  return "PNG";
}

/**
 * Gera PDF A4 com marca Alpha Brasil, QR (se disponível) e código Pix copiável.
 * Só deve ser chamado no browser (admin).
 */
export async function downloadPixBrandedPdf(input: PixBrandedPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = 14;

  const logoPng = await svgLogoToPngDataUrl();
  const logoW = 72;
  const logoH = logoPng ? (72 / 320) * logoW : 0;
  if (logoPng) {
    doc.addImage(logoPng, "PNG", (pageW - logoW) / 2, y, logoW, logoH);
    y += logoH + 10;
  } else {
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ALPHA BRASIL", pageW / 2, y + 6, { align: "center" });
    y += 14;
  }

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Pagamento via Pix", pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`Cliente: ${input.leadName.replace(/\s+/g, " ").trim() || "—"}`, margin, y);
  y += 6;
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 6;
  if (input.totalFormatted) {
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${input.totalFormatted}`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }
  y += 4;

  if (input.orderSummaryLines && input.orderSummaryLines.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Itens cobrados", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 55, 55);
    for (const line of input.orderSummaryLines) {
      if (y > 268) {
        doc.addPage();
        y = 20;
      }
      const wrapped = doc.splitTextToSize(line.replace(/\s+/g, " ").trim(), maxW);
      for (const w of wrapped) {
        doc.text(w, margin, y);
        y += 4;
      }
    }
    doc.setTextColor(70, 70, 70);
    y += 6;
  }

  y += 2;

  const qrSrc = input.qrImageRaw ? qrDataUrlForImg(input.qrImageRaw) : null;
  if (qrSrc) {
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("Escaneie o QR Code com o app do seu banco:", margin, y);
    y += 6;
    const qrMm = 52;
    try {
      doc.addImage(qrSrc, pdfImageFormat(qrSrc), (pageW - qrMm) / 2, y, qrMm, qrMm);
      y += qrMm + 10;
    } catch {
      y += 4;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Código Pix (copiar e colar)", margin, y);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  const lines = doc.splitTextToSize(input.pixCode.replace(/\s/g, ""), maxW);
  const lh = 4.2;
  for (let i = 0; i < lines.length; i++) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines[i]!, margin, y);
    y += lh;
  }
  y += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.text("Alpha Brasil — pagamento seguro. Guarde este comprovante até a confirmação.", margin, y);

  const safe = (input.leadName || "lead")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "lead";
  doc.save(`pix-alpha-brasil-${safe}-${Date.now()}.pdf`);
}
