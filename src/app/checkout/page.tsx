"use client";

import React, { useState, useMemo, useEffect, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  ChevronLeft, 
  Lock, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Truck,
  MapPin,
  Check,
  Timer,
  Mail,
  ShieldEllipsis,
  Hash,
  User as UserIcon,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductModelById } from "@/lib/product";
import { parseOrderModels, parseOrderSizes } from "@/lib/cart-sizes";
import { leve3Pague2DiscountCents } from "@/lib/offer-pricing";
import { cn } from "@/lib/utils";
import {
  flagCheckoutVisitedThisSession,
  flagRetentionNavigationFromCheckout,
  getRetentionHref,
  RETENTION_PERCENT,
} from "@/lib/checkout-retention-storage";
import {
  useCheckoutBrowserBackRetention,
  useRetentionDiscountOnTotal,
  useRetentionBannerCountdown,
} from "@/hooks/use-checkout-retention";
import { qrDataUrlForImg } from "@/lib/pix-gateway-response";
import { grantMetaPurchasePixelAfterConfirmedPix } from "@/lib/meta-purchase-gate";
import { savePosCompraPixClient } from "@/lib/pos-compra-pix-storage";

const SalesNotifications = dynamic(() => import("@/components/landing/sales-notifications").then(m => m.SalesNotifications), { ssr: false });

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const maskCEP = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const UF_RE = /^[A-Z]{2}$/;

function validateShippingAddress(fd: {
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}): string | null {
  const cep = fd.cep.replace(/\D/g, "");
  if (cep.length !== 8) return "Informe o CEP com 8 dígitos.";
  if (!fd.endereco.trim()) return "Informe o logradouro (rua, avenida…).";
  if (!fd.numero.trim()) return "Informe o número da residência.";
  if (!fd.bairro.trim()) return "Informe o bairro.";
  if (!fd.cidade.trim()) return "Informe a cidade.";
  const uf = fd.estado.replace(/\s/g, "").toUpperCase();
  if (!UF_RE.test(uf)) return "Informe o estado (UF com 2 letras), ex.: RJ.";
  return null;
}

/** ViaCEP às vezes devolve número junto ao logradouro (ex.: "Rua X, 2521"). */
function splitLogradouroENumero(raw: string): { street: string; numero: string | null } {
  const s = raw.trim();
  if (!s) return { street: "", numero: null };

  const commaTail = s.match(/^(.+),\s*(S\/N|s\/n|\d+[A-Za-z]?)\s*$/i);
  if (commaTail) {
    const street = commaTail[1]!.trim();
    const tail = commaTail[2]!;
    const numero = /^s\/n$/i.test(tail) ? "S/N" : tail;
    return { street, numero };
  }

  const dashTail = s.match(/^(.+?)\s+-\s+(\d+[A-Za-z]?)\s*$/);
  if (dashTail) {
    return { street: dashTail[1]!.trim(), numero: dashTail[2]! };
  }

  return { street: s, numero: null };
}

const SectionHeader = ({ number, title }: { number: number; title: string }) => (
  <div className="mb-6 flex min-w-0 items-center gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy-deep">
      {number}
    </div>
    <h2 className="min-w-0 font-display text-lg font-bold uppercase tracking-tight text-white">{title}</h2>
  </div>
);

const InputGroup = ({
  label,
  placeholder,
  type = "text",
  className,
  value,
  onChange,
  onBlur,
  maxLength,
  autoComplete,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  type?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  maxLength?: number;
  autoComplete?: string;
  icon?: any;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={cn(
          "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-muted-foreground/40 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all",
          Icon && "pl-11"
        )}
      />
    </div>
  </div>
);

const ORDER_BUMPS = [
  { id: "personalization", title: "Personalização Nome + Número", offer: "Fonte oficial da edição nas costas da camisa.", priceCents: 2990, image: "/images/bumps/name.png" },
  { id: "second_shirt", title: "Leve a 2ª para Presente", offer: "Com embrulho incluso. Ideal para irmão ou pai.", priceCents: 4900, image: "/images/bumps/shirt.png" },
  { id: "patch", title: "Patch de Campeão Premium", offer: "Acabamento em veludo e dourado na manga.", priceCents: 1290, image: "/images/bumps/patch.png" },
  { id: "luxury_box", title: "Embalagem Alpha Collector", offer: "Caixa premium com hot-stamping e papel seda.", priceCents: 1990, image: "/images/bumps/box.png" },
  { id: "keychain", title: "Chaveiro Réplica Escudo", offer: "Metal polido banhado a ouro.", priceCents: 990, image: "/images/bumps/keychain.png" },
  { id: "shipping_insurance", title: "Entrega Blindada", offer: "Proteção total e prioridade máxima no despacho.", priceCents: 990, image: "/images/bumps/insurance.png" },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQ = parseInt(searchParams.get("q") || "1", 10);
  const quantity = Number.isFinite(rawQ) && rawQ > 0 ? rawQ : 1;
  const orderModels = parseOrderModels(searchParams, quantity);
  const selectedProductModel = getProductModelById(orderModels[0] ?? searchParams.get("modelo"));
  const orderSizes = parseOrderSizes(searchParams, quantity);
  /** Só vem marcado com ?personalize=1 (link de campanha). Sem query = desmarcado. */
  const personalizationMasterInitial = searchParams.get("personalize") === "1";

  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(899);

  const [personalizationMaster, setPersonalizationMaster] = useState(personalizationMasterInitial);
  const [shirtPaidPersonalization, setShirtPaidPersonalization] = useState<boolean[]>(() =>
    Array(quantity).fill(false)
  );
  const [giftFreePersonalization, setGiftFreePersonalization] = useState(false);

  const [customNames, setCustomNames] = useState<string[]>([""]);
  const [customNumbers, setCustomNumbers] = useState<string[]>([""]);

  const [formData, setFormData] = useState({
    name: "", email: "", confirmEmail: "", phone: "", cpf: "",
    cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  });

  const [cepLookupBusy, setCepLookupBusy] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  
  const [pixResult, setPixResult] = useState<{
    paymentCode: string;
    paymentCodeBase64: string;
  } | null>(null);

  const pixQrDataUrl = useMemo(
    () => (pixResult?.paymentCodeBase64 ? qrDataUrlForImg(pixResult.paymentCodeBase64) : null),
    [pixResult?.paymentCodeBase64]
  );

  useEffect(() => {
    flagCheckoutVisitedThisSession();
  }, []);

  // Mangofy SDK Callback - Registrado na montagem do componente
  useEffect(() => {
    (window as any).paymentApproved = () => {
      grantMetaPurchasePixelAfterConfirmedPix();
      toast.success("Pagamento confirmado!");
      window.location.href = 'https://www.alphabrasil.store/pos-compra/upsell-1';
    };
    
    return () => {
      delete (window as any).paymentApproved;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasSecondShirtBump = selectedBumps.includes("second_shirt");
  const personalizationSlots = quantity + (hasSecondShirtBump ? 1 : 0);

  useEffect(() => {
    setShirtPaidPersonalization((prev) =>
      Array.from({ length: quantity }, (_, i) => (i < prev.length ? prev[i]! : false))
    );
  }, [quantity]);

  useEffect(() => {
    if (!hasSecondShirtBump) setGiftFreePersonalization(false);
  }, [hasSecondShirtBump]);

  useEffect(() => {
    setCustomNames((prev) => Array.from({ length: personalizationSlots }, (_, i) => prev[i] ?? ""));
    setCustomNumbers((prev) => Array.from({ length: personalizationSlots }, (_, i) => prev[i] ?? ""));
  }, [quantity, personalizationSlots]);

  useEffect(() => {
    setSelectedBumps((prev) => prev.filter((id) => id !== "personalization"));
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const toggleBump = (id: string) => {
    setSelectedBumps((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  const personalizationBump = ORDER_BUMPS.find((b) => b.id === "personalization")!;

  const togglePersonalizationMaster = () => {
    setPersonalizationMaster((m) => {
      if (m) {
        setShirtPaidPersonalization(Array(quantity).fill(false));
        return false;
      }
      setShirtPaidPersonalization(Array(quantity).fill(false));
      return true;
    });
  };

  const toggleShirtPaidPersonalization = (shirtIndex: number) => {
    setShirtPaidPersonalization((prev) => {
      const next = [...prev];
      next[shirtIndex] = !next[shirtIndex];
      return next;
    });
  };

  useCheckoutBrowserBackRetention();

  const pricing = useMemo(() => {
    const linePriceCents = orderModels.map((modelId) => Math.round(getProductModelById(modelId).price * 100));
    const subtotal = linePriceCents.reduce((sum, cents) => sum + cents, 0);
    const itemDiscount = quantity >= 3 ? Math.min(...linePriceCents) : 0;
    const paidPersonalizationLines = personalizationMaster ? shirtPaidPersonalization.filter(Boolean).length : 0;
    const personalizationCents = paidPersonalizationLines * personalizationBump.priceCents;

    const bumpsTotal = selectedBumps.reduce((sum, id) => {
      const b = ORDER_BUMPS.find((x) => x.id === id);
      if (!b || id === "personalization") return sum;
      return sum + b.priceCents;
    }, 0) + personalizationCents;

    const baseTotalCents = subtotal - itemDiscount + bumpsTotal;
    const format = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

    return {
      subtotal, discount: format(itemDiscount), discountValue: itemDiscount,
      bumpsTotal, personalizationCents, paidPersonalizationLines, baseTotalCents, quantity,
    };
  }, [quantity, selectedBumps, shirtPaidPersonalization, personalizationMaster, personalizationBump.priceCents, orderModels]);

  const retention = useRetentionDiscountOnTotal(pricing.baseTotalCents);
  const finalTotalCents = pricing.baseTotalCents - retention.discountCents;
  const retentionBannerLeft = useRetentionBannerCountdown(retention.untilMs);

  const pixAwaitingConfirm = paymentMethod === "pix" && pixResult != null;
  const pixContinueDisabled = pixLoading || paymentMethod === "card" || pixAwaitingConfirm;

  const headerBackGoesHome = retention.active;
  const retentionHref = getRetentionHref(searchParams.toString());
  const headerBackClass = "flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold";

  const handleInputChange = (field: keyof typeof formData, value: string, maskFn?: (v: string) => string) => {
    setFormData((prev) => ({ ...prev, [field]: maskFn ? maskFn(value) : value }));
  };

  const lookupCepDigits = async (digits: string) => {
    if (digits.length !== 8) return;
    setCepLookupBusy(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const j = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!res.ok || j.erro) {
        toast.error("CEP não encontrado. Confira os dígitos.");
        return;
      }
      const log = (j.logradouro ?? "").trim();
      const { street, numero: numeroFromLog } = splitLogradouroENumero(log);
      setFormData((prev) => ({
        ...prev,
        endereco: street || prev.endereco,
        ...(numeroFromLog ? { numero: numeroFromLog } : {}),
        bairro: j.bairro?.trim() || prev.bairro,
        cidade: j.localidade?.trim() || prev.cidade,
        estado: (j.uf || prev.estado).replace(/\s/g, "").toUpperCase().slice(0, 2),
      }));
      toast.success("Endereço preenchido a partir do CEP.");
    } catch {
      toast.error("Não foi possível consultar o CEP. Tente de novo.");
    } finally {
      setCepLookupBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (paymentMethod === "card") {
      toast("Pagamento via cartão temporariamente indisponível. Finalize com PIX de forma rápida e segura.", { icon: "💳" });
      return;
    }

    if (pixResult != null) {
      toast.error("Aguarde a confirmação automática do Pix ou escaneie o QR Code.");
      return;
    }

    if (personalizationMaster) {
      const paidLines = shirtPaidPersonalization.filter(Boolean).length;
      if (paidLines === 0) {
        toast.error("Selecione pelo menos uma camisa para personalização paga ou desligue o extra de personalização.");
        return;
      }
    }

    for (let i = 0; i < quantity; i++) {
      if (!personalizationMaster || !shirtPaidPersonalization[i]) continue;
      if (!(customNames[i] ?? "").trim() || !(customNumbers[i] ?? "").trim()) {
        toast.error(`Preencha nome e número na camisa ${i + 1} (personalização paga marcada).`);
        return;
      }
    }

    if (hasSecondShirtBump && giftFreePersonalization) {
      const gi = quantity;
      if (!(customNames[gi] ?? "").trim() || !(customNumbers[gi] ?? "").trim()) {
        toast.error("Preencha nome e número na camisa do presente (personalização grátis da promoção).");
        return;
      }
    }

    const shipErr = validateShippingAddress(formData);
    if (shipErr) {
      toast.error(shipErr);
      return;
    }

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phoneDigits = formData.phone.replace(/\D/g, "");
    const docDigits = formData.cpf.replace(/\D/g, "");

    if (!name || !email || !formData.phone.trim() || !formData.cpf.trim()) {
      toast.error("Preencha nome, e-mail, WhatsApp e CPF/CNPJ antes de gerar o Pix.");
      return;
    }
    if (email !== formData.confirmEmail.trim()) {
      toast.error("Os e-mails não coincidem.");
      return;
    }
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return;
    }
    if (phoneDigits.length < 10) {
      toast.error("Informe um telefone com DDD.");
      return;
    }

    const amount = Number((finalTotalCents / 100).toFixed(2));
    const orderRef = crypto.randomUUID();

    setPixLoading(true);
    try {
      const meta = Object.fromEntries(searchParams.entries()) as Record<string, string>;
      meta.alpha_order_ref = orderRef;

      const config = {
        total_price: amount,
        customer: {
            name: name,
            document: docDigits,
            email: email,
            phone: phoneDigits,
        },
        shipping: { 
            zip_code: formData.cep.replace(/\D/g, ""), 
            street: formData.endereco.trim(), 
            city: formData.cidade.trim(), 
            state: formData.estado.trim(), 
            country: 'BR' 
        },
        metadata: meta,
        items: [
            { name: 'CamisaBrasil', price: amount, quantity: 1 }
        ]
      };

      // Execução da SDK Fast API
      const response = await (window as any).generatePix(config);

      if (response && response.success) {
        setPixResult({
          paymentCode: response.pixCode,
          paymentCodeBase64: response.qrCodeImage,
        });

        savePosCompraPixClient({
          mangofyCustomer: {
            name,
            email,
            phoneDigits,
            docDigits,
            cep: formData.cep.replace(/\D/g, ""),
            street: formData.endereco.trim(),
            city: formData.cidade.trim(),
            state: formData.estado.replace(/\s/g, "").toUpperCase().slice(0, 2),
          },
        });

        void fetch("/api/checkout/pix-record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderRef,
            amountCents: finalTotalCents,
            quantity,
            name,
            email,
            confirmEmail: formData.confirmEmail.trim(),
            phone: formData.phone.trim(),
            cpf: formData.cpf.trim(),
            cep: formData.cep.replace(/\D/g, ""),
            endereco: formData.endereco.trim(),
            numero: formData.numero.trim(),
            complemento: formData.complemento.trim(),
            bairro: formData.bairro.trim(),
            cidade: formData.cidade.trim(),
            estado: formData.estado.replace(/\s/g, "").toUpperCase().slice(0, 2),
          }),
        }).then(async (rec) => {
          if (!rec.ok) {
            const j = (await rec.json().catch(() => ({}))) as { error?: string };
            console.warn("[checkout] registo Supabase do Pix falhou:", j.error ?? rec.status);
          }
        }).catch((err) => {
          console.warn("[checkout] registo Supabase do Pix falhou:", err);
        });

        toast.success("Pix gerado! Escaneie o QR ou copie o código.");

      } else {
        throw new Error(response.message || "Erro ao gerar Pix. Verifique os dados e tente novamente.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o Pix.";
      toast.error(msg);
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixResult?.paymentCode) return;
    try {
      await navigator.clipboard.writeText(pixResult.paymentCode);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  return (
    <motion.div
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[#04070d] text-foreground pb-20"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="sticky top-0 z-50 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-gold-bright via-gold to-gold-bright py-3 text-navy-deep shadow-[0_4px_20px_-4px_rgba(212,175,55,0.4)]">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4 text-center">
          <div className="flex items-center gap-2">
            <Timer size={20} className="animate-pulse" strokeWidth={2.5} />
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em]">
              ALTA DEMANDA! RESERVA EXPIRA EM:
            </p>
          </div>
          <div className="flex items-center justify-center rounded bg-navy-deep px-3 py-1 font-mono text-xl sm:text-2xl font-black tabular-nums tracking-widest text-gold-bright shadow-inner">
            {formatTime(timeLeft)}
          </div>
        </div>
        {retention.active && retention.untilMs != null && (
          <p className="border-t border-navy-deep/20 mt-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-navy-deep/90">
            Desconto retenção {RETENTION_PERCENT}% ativo · expira em{" "}
            <span className="font-mono tabular-nums font-black text-navy-deep">
              {String(Math.floor(retentionBannerLeft / 60000)).padStart(2, "0")}:
              {String(Math.floor((retentionBannerLeft % 60000) / 1000)).padStart(2, "0")}
            </span>
          </p>
        )}
      </div>

      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          {headerBackGoesHome ? (
            <button type="button" onClick={() => router.push("/")} className={headerBackClass}>
              <ChevronLeft size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Voltar</span>
            </button>
          ) : (
            <Link href={retentionHref} replace prefetch={false} onClick={() => flagRetentionNavigationFromCheckout()} className={headerBackClass}>
              <ChevronLeft size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Voltar</span>
            </Link>
          )}
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <Lock size={16} className="text-muted-foreground/40" />
        </div>
      </header>

      <a
        href="#checkout-dados-pessoais"
        className="group relative block w-full overflow-hidden border-b border-white/[0.06] bg-[#050a14] outline-none transition-[opacity,filter] hover:opacity-[0.96] focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-inset"
        aria-label="Ir para dados pessoais"
      >
        <div className="relative mx-auto max-w-[1600px]">
          <Image
            src="/images/checkout-hero-banner.webp"
            alt="Finalize sua compra — toque para preencher seus dados"
            width={1600}
            height={450}
            className="w-full h-auto"
            priority
            sizes="(max-width: 1024px) 100vw, 1600px"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
        </div>
      </a>

      <main className="mx-auto mt-8 max-w-7xl px-4 sm:px-5 lg:mt-12">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-8">
            <div className="glass-dark flex min-w-0 flex-col gap-2 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Truck className="shrink-0 text-gold" size={20} />
                <p className="text-xs font-bold uppercase tracking-widest text-white/90">Você está adquirindo:</p>
              </div>
              <p className="min-w-0 text-xs font-bold leading-snug text-gold-bright sm:text-right">
                {pricing.quantity} un. ({orderModels.map((m) => getProductModelById(m).name).join(", ")})
                {orderSizes.length === 1 ? ` · Tam. ${orderSizes[0]}` : orderSizes.length > 1 ? ` · Tams.: ${orderSizes.join(", ")}` : ""}
              </p>
            </div>

            <section
              id="checkout-dados-pessoais"
              className="glass-dark scroll-mt-[calc(10rem+env(safe-area-inset-top,0px))] rounded-[2rem] p-6 md:p-8"
            >
              <SectionHeader number={1} title="Dados Pessoais" />
              <div className="grid gap-4 md:grid-cols-2">
                <InputGroup label="Nome Completo" placeholder="Digite seu nome completo" className="md:col-span-2" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                <InputGroup label="E-mail" placeholder="seu@email.com" type="email" icon={Mail} value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                <InputGroup label="Confirmar e-mail" placeholder="repita seu e-mail" type="email" icon={Mail} value={formData.confirmEmail} onChange={(e) => handleInputChange("confirmEmail", e.target.value)} />
                <InputGroup label="WhatsApp" placeholder="(00) 00000-0000" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value, maskPhone)} maxLength={15} />
                <InputGroup label="CPF ou CNPJ" placeholder="000.000.000-00" value={formData.cpf} onChange={(e) => handleInputChange("cpf", e.target.value, maskCPF)} maxLength={14} />
              </div>
            </section>

            <section className="glass-dark rounded-[2rem] p-6 md:p-8">
              <SectionHeader number={2} title="Endereço de entrega" />
              <p className="mb-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" aria-hidden />
                Informe o endereço para envio. Ao sair do CEP com 8 dígitos, preenchemos rua, bairro, cidade e UF pelo ViaCEP.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-end md:gap-3">
                  <div className="min-w-0 flex-1">
                    <InputGroup label="CEP" placeholder="00000-000" value={formData.cep} onChange={(e) => handleInputChange("cep", e.target.value, maskCEP)} onBlur={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length === 8) void lookupCepDigits(d); }} maxLength={9} autoComplete="postal-code" />
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={cepLookupBusy || formData.cep.replace(/\D/g, "").length !== 8} className="h-12 shrink-0 border-gold/30 px-4 text-[11px] font-bold uppercase tracking-widest" onClick={() => void lookupCepDigits(formData.cep.replace(/\D/g, ""))}>
                    {cepLookupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar CEP"}
                  </Button>
                </div>
                <InputGroup label="Endereço (logradouro)" placeholder="Rua, avenida…" className="md:col-span-2" value={formData.endereco} onChange={(e) => handleInputChange("endereco", e.target.value)} autoComplete="street-address" />
                <InputGroup label="Número" placeholder="123" value={formData.numero} onChange={(e) => handleInputChange("numero", e.target.value)} />
                <InputGroup label="Complemento" placeholder="Apto, bloco… (opcional)" value={formData.complemento} onChange={(e) => handleInputChange("complemento", e.target.value)} />
                <InputGroup label="Bairro" placeholder="Bairro" value={formData.bairro} onChange={(e) => handleInputChange("bairro", e.target.value)} />
                <InputGroup label="Cidade" placeholder="Cidade" value={formData.cidade} onChange={(e) => handleInputChange("cidade", e.target.value)} autoComplete="address-level2" />
                <InputGroup label="Estado (UF)" placeholder="SP" value={formData.estado} onChange={(e) => handleInputChange("estado", e.target.value, (v) => v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))} maxLength={2} autoComplete="address-level1" />
              </div>
            </section>

            <section className="glass-dark rounded-[2rem] p-6 md:p-8">
              <SectionHeader number={3} title="Pagamento" />
              <div className="mb-8 grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("card")} className={cn("flex flex-col items-center gap-2 rounded-xl border py-4 transition-all", paymentMethod === "card" ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-white/5 bg-white/[0.02] hover:border-white/10")}>
                  <CreditCard size={20} className={paymentMethod === "card" ? "text-gold" : "text-muted-foreground/60"} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cartão</span>
                </button>
                <button onClick={() => setPaymentMethod("pix")} className={cn("flex flex-col items-center gap-2 rounded-xl border py-4 transition-all", paymentMethod === "pix" ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-white/5 bg-white/[0.02] hover:border-white/10")}>
                  <QrCode size={20} className={paymentMethod === "pix" ? "text-gold" : "text-muted-foreground/60"} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">PIX</span>
                </button>
              </div>

              {paymentMethod === "pix" ? (
                <div className="space-y-4 rounded-2xl bg-white/[0.02] p-6 border border-white/5">
                  <div className="flex items-center gap-2 text-gold-bright mb-4">
                    <QrCode size={20} />
                    <p className="text-sm font-bold uppercase tracking-widest">Instruções do Pix</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pagamento 100% seguro e processado instantaneamente para garantir o envio imediato.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0a111b]/95 p-6 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                  <div className="mb-2 flex items-center justify-center gap-2 text-slate-300/90">
                    <CreditCard size={16} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Cartão de crédito</p>
                  </div>
                  <p className="text-[15px] font-semibold leading-relaxed text-white/95">
                    Pagamento via cartão temporariamente indisponível
                  </p>
                  <p className="mx-auto max-w-[34ch] text-sm leading-relaxed text-slate-300/85">
                    No momento, finalize seu pedido com <span className="font-semibold text-gold-bright">PIX</span> de forma rápida e segura.
                  </p>
                </div>
              )}
            </section>

            <section className="glass-dark overflow-hidden rounded-[2rem] p-0">
              <div className="bg-green-600/10 px-6 py-2 border-b border-green-500/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">🔥 OPORTUNIDADE ÚNICA</span>
              </div>
              <div className="p-6 md:p-8">
                <SectionHeader number={4} title="Adicione ao seu Pedido" />
                <div className="grid gap-4">
                  {ORDER_BUMPS.map((bump) => {
                    const isPersonalization = bump.id === "personalization";
                    const isSecondShirt = bump.id === "second_shirt";
                    const isBumpSelected = isPersonalization ? personalizationMaster : selectedBumps.includes(bump.id);
                    const fmtBrl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
                    const personalizationPriceLabel = isPersonalization ? pricing.paidPersonalizationLines > 0 ? `+ ${fmtBrl(pricing.personalizationCents)}` : `+ ${fmtBrl(bump.priceCents)} / camisa` : `+ ${fmtBrl(bump.priceCents)}`;

                    return (
                      <div key={bump.id} className={cn("group flex flex-col overflow-hidden rounded-2xl border transition-all", isBumpSelected ? "border-gold/60 bg-gold/5 ring-1 ring-gold/40 shadow-gold/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]")}>
                        <button type="button" onClick={() => isPersonalization ? togglePersonalizationMaster() : toggleBump(bump.id)} className="flex w-full min-w-0 items-center gap-4 p-4 text-left">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10">
                            <Image src={bump.image} alt={bump.title} fill className="object-cover" sizes="64px" loading="lazy" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white">{bump.title}</h4>
                            <p className="mt-1 break-words text-[13px] leading-snug text-muted-foreground/95 sm:text-[15px] sm:leading-relaxed">{bump.offer}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-bold uppercase text-gold-bright">{personalizationPriceLabel}</p>
                            <div className={cn("ml-auto mt-2 flex h-5 w-5 items-center justify-center rounded border", isBumpSelected ? "border-gold bg-gold" : "border-white/50 bg-white/5")}>
                              {isBumpSelected && <Check size={12} className="font-bold text-navy-deep" />}
                            </div>
                          </div>
                        </button>

                        {isPersonalization && personalizationMaster && (
                          <div className="space-y-4 border-t border-white/5 bg-white/[0.02] p-5">
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Marque em quais camisas do pedido quer nome e número nas costas. Só paga <span className="text-gold/90">{fmtBrl(personalizationBump.priceCents)}</span> por camisa selecionada.
                            </p>
                            {Array.from({ length: quantity }, (_, shirtIndex) => {
                              const shirtModel = getProductModelById(orderModels[shirtIndex] ?? selectedProductModel.id);
                              return (
                                <div key={shirtIndex} className="rounded-xl border border-white/[0.06] bg-[#060a12]/80 p-4">
                                  <button type="button" onClick={() => toggleShirtPaidPersonalization(shirtIndex)} className="mb-3 flex w-full items-center gap-3 text-left">
                                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors", shirtPaidPersonalization[shirtIndex] ? "border-gold bg-gold" : "border-white/50 bg-white/5 hover:border-white/70")}>
                                      {shirtPaidPersonalization[shirtIndex] ? <Check size={12} className="text-navy-deep" /> : null}
                                    </span>
                                    <span className="text-[11px] font-semibold leading-snug text-white">Personalização paga nesta camisa<span className="ml-1.5 text-gold/85">(+ {fmtBrl(personalizationBump.priceCents)})</span></span>
                                  </button>
                                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gold/90">Camisa {shirtIndex + 1}<span className="ml-2 font-semibold text-white/80">· {shirtModel.name}</span>{orderSizes[shirtIndex] ? <span className="ml-2 font-normal text-muted-foreground">· Tam. {orderSizes[shirtIndex]}</span> : null}</p>
                                  {shirtPaidPersonalization[shirtIndex] ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                      <div className="flex flex-col gap-1.5">
                                        <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-gold/70">Nome na camisa</label>
                                        <div className="relative">
                                          <UserIcon className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40" />
                                          <input type="text" placeholder="Ex: NEYMAR JR" value={customNames[shirtIndex] ?? ""} onChange={(e) => { const v = e.target.value.toUpperCase(); setCustomNames((prev) => { const next = [...prev]; next[shirtIndex] = v; return next; }); }} className="h-10 w-full rounded-lg border border-gold/20 bg-[#060a12] pl-10 pr-4 text-xs font-bold text-white placeholder:text-muted-foreground/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-1.5">
                                        <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-gold/70">Número</label>
                                        <div className="relative">
                                          <Hash className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40" />
                                          <input type="text" placeholder="Ex: 10" maxLength={2} value={customNumbers[shirtIndex] ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); setCustomNumbers((prev) => { const next = [...prev]; next[shirtIndex] = v; return next; }); }} className="h-10 w-full rounded-lg border border-gold/20 bg-[#060a12] pl-10 pr-4 text-xs font-bold text-white placeholder:text-muted-foreground/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/50" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : <p className="text-[10px] text-muted-foreground/80">Sem personalização nesta unidade — sem custo adicional.</p>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isSecondShirt && selectedBumps.includes("second_shirt") && (
                          <div className="space-y-4 border-t border-white/5 bg-white/[0.02] p-5">
                            <button type="button" onClick={() => setGiftFreePersonalization((v) => !v)} className="flex w-full items-start gap-3 rounded-xl text-left">
                              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors", giftFreePersonalization ? "border-gold bg-gold" : "border-white/50 bg-white/5 hover:border-white/70")}>
                                {giftFreePersonalization ? <Check size={12} className="text-navy-deep" /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-[12px] font-semibold text-white">Nome e número grátis na camisa do presente</span>
                                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Exclusivo desta promoção.</span>
                              </span>
                              <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-400/95">Grátis</span>
                            </button>

                            {giftFreePersonalization && (
                              <div className="rounded-xl border border-emerald-500/20 bg-[#060a12]/80 p-4">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">Camisa do presente (promoção)</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-gold/70">Nome na camisa</label>
                                    <div className="relative">
                                      <UserIcon className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40" />
                                      <input type="text" placeholder="Ex: NEYMAR JR" value={customNames[quantity] ?? ""} onChange={(e) => { const v = e.target.value.toUpperCase(); setCustomNames((prev) => { const next = [...prev]; next[quantity] = v; return next; }); }} className="h-10 w-full rounded-lg border border-emerald-500/25 bg-[#060a12] pl-10 pr-4 text-xs font-bold text-white placeholder:text-muted-foreground/30 focus:border-emerald-500/45 focus:outline-none focus:ring-1 focus:ring-emerald-500/35" />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-gold/70">Número</label>
                                    <div className="relative">
                                      <Hash className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40" />
                                      <input type="text" placeholder="Ex: 10" maxLength={2} value={customNumbers[quantity] ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); setCustomNumbers((prev) => { const next = [...prev]; next[quantity] = v; return next; }); }} className="h-10 w-full rounded-lg border border-emerald-500/25 bg-[#060a12] pl-10 pr-4 text-xs font-bold text-white placeholder:text-muted-foreground/30 focus:border-emerald-500/45 focus:outline-none focus:ring-1 focus:ring-emerald-500/35" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className="h-fit min-w-0 w-full max-w-full lg:sticky lg:top-24">
            <div className="glass-dark max-w-full min-w-0 overflow-hidden rounded-[2rem] p-4 sm:p-6 md:p-8">
              <div className={cn("mb-6 grid w-full gap-2", quantity === 1 ? "grid-cols-1" : quantity === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
                {Array.from({ length: quantity }, (_, i) => {
                  const lineModel = getProductModelById(orderModels[i]);
                  const thumbSrc = lineModel.images.checkout;
                  return (
                    <div key={`summary-thumb-${i}-${lineModel.id}`} className="relative aspect-square w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg bg-black/20">
                      <Image 
                        src={thumbSrc} 
                        alt={`${lineModel.name} — camisa ${i + 1}`} 
                        fill 
                        sizes="(max-width: 640px) 45vw, 200px" 
                        className={cn(
                          "object-contain transition-transform duration-300", 
                          lineModel.id === "edicao-vermelha" ? "scale-[0.85]" : "scale-[1.05] p-2"
                        )} 
                        priority={i === 0} 
                      />
                      {quantity > 1 ? <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/95 backdrop-blur-sm">Camisa {i + 1}</span> : null}
                    </div>
                  );
                })}
              </div>
              <h3 className="mb-6 font-display text-lg font-bold uppercase tracking-tight text-white">Resumo da Compra</h3>
              <div className="mb-8 min-w-0 space-y-4">
                {quantity === 1 ? (
                  <>
                    <div className="flex min-w-0 justify-between gap-3 text-sm">
                      <span className="min-w-0 shrink text-muted-foreground">Edição</span>
                      <span className="shrink-0 font-bold text-white">{getProductModelById(orderModels[0]).name}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-3 text-sm">
                      <span className="min-w-0 shrink text-muted-foreground">Tamanho</span>
                      <span className="shrink-0 font-bold text-gold-bright">{orderSizes[0]}</span>
                    </div>
                  </>
                ) : (
                  <div className="min-w-0 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Itens</p>
                    {orderSizes.map((s, i) => {
                      const itemModel = getProductModelById(orderModels[i]);
                      return (
                        <div key={i} className="flex min-w-0 justify-between gap-3 text-sm">
                          <span className="min-w-0 shrink text-muted-foreground">Camisa {i + 1} ({itemModel.name})</span>
                          <span className="shrink-0 font-bold text-gold-bright">{s}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex min-w-0 justify-between gap-3 text-sm">
                  <span className="min-w-0 shrink text-muted-foreground">Subtotal ({pricing.quantity} un)</span>
                  <span className="shrink-0 tabular-nums text-white">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pricing.subtotal / 100)}</span>
                </div>
                {pricing.discountValue > 0 && (
                  <div className="flex min-w-0 justify-between gap-3 text-sm font-bold text-green-400">
                    <span className="min-w-0 shrink leading-snug">Leve 3, Pague 2 (não cumulativa)</span>
                    <span className="shrink-0 tabular-nums">- {pricing.discount}</span>
                  </div>
                )}
                {pricing.bumpsTotal > 0 && (
                  <div className="flex min-w-0 justify-between gap-3 text-sm font-bold text-gold">
                    <span className="min-w-0 shrink">Adicionais</span>
                    <span className="shrink-0 tabular-nums">+ {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pricing.bumpsTotal / 100)}</span>
                  </div>
                )}
                {retention.active && retention.discountCents > 0 && (
                  <div className="flex min-w-0 justify-between gap-3 text-sm font-bold text-green-400">
                    <span className="min-w-0 shrink leading-snug">Desconto retenção ({RETENTION_PERCENT}%)</span>
                    <span className="shrink-0 tabular-nums">- {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(retention.discountCents / 100)}</span>
                  </div>
                )}
                <div className="flex min-w-0 justify-between gap-3 text-sm font-bold">
                  <span className="min-w-0 shrink text-muted-foreground">Frete</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-widest text-green-400">Grátis</span>
                </div>
                <div className="my-6 h-px bg-white/10" />
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                  <span className="shrink-0 font-display text-lg font-bold text-white">Total Hoje:</span>
                  <span className="price-gold-glow min-w-0 break-words text-right font-display text-2xl font-bold tabular-nums tracking-tight text-gold-bright sm:text-3xl">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalTotalCents / 100)}
                  </span>
                </div>
              </div>

              {pixResult != null && (
                <div className="mb-6 min-w-0 max-w-full space-y-4 overflow-hidden rounded-2xl border border-gold/25 bg-[#060a12]/90 p-3 sm:p-4">
                  <p className="text-center font-display text-[10px] font-bold uppercase tracking-[0.28em] text-gold-bright">
                    Pague com Pix
                  </p>
                  {pixResult.paymentCode ? (
                    <div className="flex w-full justify-center px-1">
                      <div className="relative aspect-square w-full max-w-[min(220px,100%)] overflow-hidden rounded-xl border border-white/10 bg-white p-2 sm:max-w-[220px]">
                        <img src={pixQrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`} alt="QR Code Pix" className="h-full w-full max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`; }} />
                      </div>
                    </div>
                  ) : null}
                  <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Pix copia e cola
                  </p>
                  <div className="max-h-28 min-h-0 max-w-full overflow-x-auto overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white/90 [overflow-wrap:anywhere]">
                    {pixResult.paymentCode}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full max-w-full shrink-0 border-gold/30 text-[11px] font-bold uppercase tracking-widest" onClick={copyPixCode}>
                    <Copy className="mr-2 h-4 w-4 shrink-0" /> Copiar código
                  </Button>
                  {pixAwaitingConfirm && (
                    <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-gold-bright/90">À espera da confirmação automática...</p>
                  )}
                </div>
              )}

              <Button size="xl" onClick={handleFinalize} disabled={pixContinueDisabled} className="shimmer-btn w-full font-bold uppercase tracking-widest py-8 rounded-2xl disabled:opacity-60">
                 {pixLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />A gerar Pix…</> : pixResult != null ? "Aguardando pagamento..." : "Finalizar compra"}
              </Button>
            </div>
          </aside>
        </div>
      </main>
      
      <SalesNotifications isVisible={true} />
    </motion.div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoadingFallback />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#04070d] px-6">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <p className="text-center font-display text-[10px] font-bold uppercase tracking-[0.32em] text-gold-bright">A carregar o checkout</p>
      <div className="h-0.5 w-32 animate-pulse rounded-full bg-gold/30" />
    </div>
  );
}