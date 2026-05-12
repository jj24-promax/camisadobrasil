"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, FileDown, Loader2, QrCode, Sparkles } from "lucide-react";

import { createAdminCollectPixAction } from "@/app/admin/(dashboard)/cobrar-pix/actions";
import {
  AdminSettingsFieldLabel,
  AdminSettingsSection,
  adminSettingsInputClass,
} from "@/components/admin/admin-settings-section";
import { Button } from "@/components/ui/button";
import { downloadPixBrandedPdf } from "@/lib/admin/download-pix-branded-pdf";
import {
  computeCollectPixTotalCents,
  defaultCollectPixCart,
  type CollectPixCart,
} from "@/lib/admin/collect-pix-pricing";
import { formatBRL } from "@/lib/admin-format";
import { getMinCheckoutAmountCents } from "@/lib/checkout-min-amount-cents";
import { qrDataUrlForImg } from "@/lib/pix-gateway-response";
import { getSelectableProductModels } from "@/lib/product";
import type { ProductModelId } from "@/lib/product";
import { UPSELL_BAG_CENTS, UPSELL_CAP_CENTS, UPSELL_CUP_CENTS } from "@/lib/pos-compra-upsell-pricing";
import { cn } from "@/lib/utils";

function QtyInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <AdminSettingsFieldLabel htmlFor={id}>{label}</AdminSettingsFieldLabel>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={50}
        value={value || ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(0);
            return;
          }
          const n = Math.min(50, Math.max(0, Math.floor(Number(raw))));
          onChange(Number.isNaN(n) ? 0 : n);
        }}
        className={cn(adminSettingsInputClass, "h-10 max-w-[6.5rem] text-center font-mono text-sm")}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AdminCollectPixView() {
  const models = useMemo(() => getSelectableProductModels(), []);
  const [cart, setCart] = useState<CollectPixCart>(() => defaultCollectPixCart());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixB64, setPixB64] = useState("");
  const [lastSummary, setLastSummary] = useState<string[]>([]);
  const [lastTotalCents, setLastTotalCents] = useState<number | null>(null);

  const pricing = useMemo(() => computeCollectPixTotalCents(cart), [cart]);
  const minCents = useMemo(() => getMinCheckoutAmountCents(), []);
  const docDigits = useMemo(() => cpf.replace(/\D/g, ""), [cpf]);
  const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const canGenerate =
    pricing.totalCents >= minCents &&
    name.trim().length > 1 &&
    emailOk &&
    phoneDigits.length >= 10 &&
    (docDigits.length === 11 || docDigits.length === 14);

  const setShirtQty = useCallback((id: ProductModelId, n: number) => {
    setCart((c) => ({ ...c, shirts: { ...c.shirts, [id]: n } }));
  }, []);

  const resetPix = useCallback(() => {
    setPixCode("");
    setPixB64("");
    setLastSummary([]);
    setLastTotalCents(null);
  }, []);

  const runGenerate = async () => {
    resetPix();
    setBusy(true);
    const result = await createAdminCollectPixAction({
      customerName: name.trim(),
      email: email.trim(),
      phone,
      cpf,
      cart,
    });
    if (!result.ok) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    setPixCode(result.paymentCode);
    setPixB64(result.paymentCodeBase64 || "");
    setLastSummary(result.summaryParts);
    setLastTotalCents(result.totalCents);
    toast.success("Pix gerado. Envie o código ou o PDF ao cliente.");
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
        leadName: name.trim() || "Cliente",
        pixCode,
        qrImageRaw: pixB64 || undefined,
        orderSummaryLines: lastSummary.length ? lastSummary : undefined,
        totalFormatted: lastTotalCents != null ? formatBRL(lastTotalCents) : undefined,
      });
      toast.success("PDF baixado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o PDF.";
      toast.error(msg);
    } finally {
      setPdfBusy(false);
    }
  };

  const qrUrl = pixB64 ? qrDataUrlForImg(pixB64) : null;

  return (
    <div className="space-y-10 sm:space-y-12">
      <AdminSettingsSection
        title="Montar cobrança"
        description="Escolha as quantidades com os mesmos preços do site (inclui promo Leve 3, Pague 2 nas camisas e valores dos adicionais do pós-compra). Depois preencha os dados do cliente para gerar o Pix na Royal."
        icon={Sparkles}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold/80">Camisas</p>
            <div className="grid gap-6 sm:grid-cols-3">
              {models.map((m) => (
                <QtyInput
                  key={m.id}
                  id={`shirt-${m.id}`}
                  label={m.name}
                  value={cart.shirts[m.id] ?? 0}
                  onChange={(n) => setShirtQty(m.id, n)}
                  hint={`${formatBRL(Math.round(m.price * 100))} / un.`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold/80">Adicionais (site)</p>
            <div className="grid gap-6 sm:grid-cols-3">
              <QtyInput
                id="addon-cap"
                label="Boné Alpha"
                value={cart.capQty}
                onChange={(n) => setCart((c) => ({ ...c, capQty: n }))}
                hint={`${formatBRL(UPSELL_CAP_CENTS)} / un.`}
              />
              <QtyInput
                id="addon-bag"
                label="Shoulder Bag"
                value={cart.bagQty}
                onChange={(n) => setCart((c) => ({ ...c, bagQty: n }))}
                hint={`${formatBRL(UPSELL_BAG_CENTS)} / un.`}
              />
              <QtyInput
                id="addon-cup"
                label="Copo térmico"
                value={cart.cupQty}
                onChange={(n) => setCart((c) => ({ ...c, cupQty: n }))}
                hint={`${formatBRL(UPSELL_CUP_CENTS)} / un.`}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
              <p className="font-display text-2xl font-bold tracking-tight text-gold-bright sm:text-3xl">
                {formatBRL(pricing.totalCents)}
              </p>
              {pricing.discountCents > 0 ? (
                <p className="mt-1 text-xs text-emerald-300/90">
                  Promo Leve 3, Pague 2 aplicada (−{formatBRL(pricing.discountCents)})
                </p>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground sm:max-w-xs sm:text-right">
              Mínimo {formatBRL(minCents)} (mesma regra do checkout). {pricing.shirtLineCount} camisa(s) nas linhas.
            </p>
          </div>
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection
        title="Dados do cliente (Royal Banking)"
        description="Nome, e-mail, telefone e CPF/CNPJ são enviados ao gateway para gerar o Pix — igual ao checkout."
        icon={QrCode}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="collect-name">Nome completo</AdminSettingsFieldLabel>
            <input
              id="collect-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={cn(adminSettingsInputClass, "h-10 w-full")}
            />
          </div>
          <div className="space-y-2">
            <AdminSettingsFieldLabel htmlFor="collect-email">E-mail</AdminSettingsFieldLabel>
            <input
              id="collect-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={cn(adminSettingsInputClass, "h-10 w-full")}
            />
          </div>
          <div className="space-y-2">
            <AdminSettingsFieldLabel htmlFor="collect-phone">Telefone (WhatsApp)</AdminSettingsFieldLabel>
            <input
              id="collect-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="27999990000"
              className={cn(adminSettingsInputClass, "h-10 w-full")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="collect-cpf">CPF ou CNPJ</AdminSettingsFieldLabel>
            <input
              id="collect-cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              autoComplete="off"
              placeholder="Somente números"
              className={cn(adminSettingsInputClass, "h-10 w-full max-w-md")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="bg-gold text-navy-deep hover:bg-gold/90"
            disabled={busy || !canGenerate}
            onClick={() => void runGenerate()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gerar Pix…
              </>
            ) : (
              "Gerar Pix"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/15"
            disabled={busy}
            onClick={() => {
              setCart(defaultCollectPixCart());
              resetPix();
              toast.success("Carrinho limpo.");
            }}
          >
            Limpar quantidades
          </Button>
        </div>
      </AdminSettingsSection>

      {pixCode ? (
        <AdminSettingsSection
          title="Pix pronto"
          description="Copie o código, mostre o QR ou baixe o PDF para enviar ao lead. Este fluxo não cria lead nem venda no Supabase — só cobrança avulsa."
          icon={FileDown}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr]">
            <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-2">
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
            <div className="space-y-4">
              {lastSummary.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-muted-foreground">
                  {lastSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <p className="break-all rounded-lg border border-white/10 bg-white/[0.04] p-3 font-mono text-xs leading-relaxed text-white/90">
                {pixCode}
              </p>
              <div className="flex flex-wrap gap-2">
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
                  {pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  Baixar PDF
                </Button>
                <Button type="button" variant="outline" className="border-white/15" disabled={busy} onClick={() => void runGenerate()}>
                  Gerar outro Pix (mesmo pedido)
                </Button>
              </div>
            </div>
          </div>
        </AdminSettingsSection>
      ) : null}
    </div>
  );
}
