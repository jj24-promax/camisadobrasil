"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, FileDown, Loader2, QrCode } from "lucide-react";

import { regenerateRoyalPixAction } from "@/app/admin/(dashboard)/leads/actions";
import { downloadPixBrandedPdf } from "@/lib/admin/download-pix-branded-pdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { qrDataUrlForImg } from "@/lib/pix-gateway-response";
import { cn } from "@/lib/utils";

type AdminRegeneratePixDialogProps = {
  leadId: string | null;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminRegeneratePixDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
}: AdminRegeneratePixDialogProps) {
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState("");
  const [pixB64, setPixB64] = useState("");

  const qrUrl = useMemo(() => (pixB64 ? qrDataUrlForImg(pixB64) : null), [pixB64]);

  const reset = useCallback(() => {
    setBusy(false);
    setPdfBusy(false);
    setErrorMsg(null);
    setPixCode("");
    setPixB64("");
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const runGenerate = async () => {
    if (!leadId) return;
    setBusy(true);
    setErrorMsg(null);
    setPixCode("");
    setPixB64("");

    const result = await regenerateRoyalPixAction(leadId);
    if (!result.ok) {
      setErrorMsg(result.error);
      toast.error(result.error);
      setBusy(false);
      return;
    }

    setPixCode(result.paymentCode);
    setPixB64(result.paymentCodeBase64 || "");
    toast.success("Novo Pix gerado. Copie o código ou envie o print do QR ao cliente.");
    setBusy(false);
  };

  const copyCode = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  const downloadPdf = async () => {
    if (!pixCode) return;
    setPdfBusy(true);
    try {
      await downloadPixBrandedPdf({
        leadName,
        pixCode,
        qrImageRaw: pixB64 || undefined,
      });
      toast.success("PDF baixado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o PDF.";
      toast.error(msg);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md border-white/10 bg-[#0a0e14] text-foreground shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base uppercase tracking-wide text-white">
            <QrCode className="h-5 w-5 text-gold" aria-hidden />
            Novo Pix para o lead
          </DialogTitle>
          <DialogDescription className="text-left text-muted-foreground">
            <span className="font-medium text-foreground/90">{leadName}</span>
            {" — "}
            Atualiza a referência da venda <strong className="text-foreground">pendente</strong> ligada a este lead e
            gera um novo QR/código via Royal Banking. Use quando o cliente não pagou o Pix anterior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMsg ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMsg}</p>
          ) : null}

          {!pixCode ? (
            <Button
              type="button"
              className="w-full bg-gold text-navy-deep hover:bg-gold/90"
              disabled={busy || !leadId}
              onClick={() => void runGenerate()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A gerar…
                </>
              ) : (
                "Gerar novo Pix"
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex aspect-square w-[220px] max-w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-2">
                <img
                  src={
                    qrUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCode)}`
                  }
                  alt="QR Code Pix"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCode)}`;
                  }}
                />
              </div>
              <p className="break-all rounded-lg border border-white/10 bg-white/[0.04] p-3 font-mono text-xs leading-relaxed text-white/90">
                {pixCode}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="border-white/15" onClick={() => void copyCode()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15"
                  disabled={pdfBusy}
                  onClick={() => void downloadPdf()}
                >
                  {pdfBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 sm:col-span-2"
                  disabled={busy}
                  onClick={() => void runGenerate()}
                >
                  Gerar outro Pix
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
