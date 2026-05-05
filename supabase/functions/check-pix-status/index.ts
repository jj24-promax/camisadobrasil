import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LeadRow = {
  nome?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
};

async function resolveLeadByTracking(
  supabase: ReturnType<typeof createClient>,
  trackingCode: string
): Promise<{ lead: LeadRow | null; codigoRastreio: string }> {
  const code = trackingCode.trim().toUpperCase();

  const { data: leadDirect } = await supabase
    .from("leads")
    .select("nome, cpf, telefone, email")
    .eq("codigo_rastreio", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (leadDirect) return { lead: leadDirect as LeadRow, codigoRastreio: code };

  const { data: venda } = await supabase
    .from("vendas")
    .select("lead_id")
    .eq("codigo_rastreio", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!venda?.lead_id) return { lead: null, codigoRastreio: code };

  const { data: leadFromVenda } = await supabase
    .from("leads")
    .select("nome, cpf, telefone, email")
    .eq("id", venda.lead_id)
    .maybeSingle();

  return { lead: (leadFromVenda as LeadRow) ?? null, codigoRastreio: code };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const trackingCodeRaw = typeof body.trackingCode === "string" ? body.trackingCode.trim().toUpperCase() : "";
    const ensureCharge = Boolean(body.ensureCharge);

    if (!trackingCodeRaw) {
      return new Response(JSON.stringify({ error: "trackingCode ausente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead, codigoRastreio } = await resolveLeadByTracking(supabase, trackingCodeRaw);
    if (!lead?.nome?.trim() || !lead?.email?.trim()) {
      return new Response(JSON.stringify({ error: "Lead não encontrado para este código." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doc = String(lead.cpf ?? "").replace(/\D/g, "");
    const tel = String(lead.telefone ?? "").replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) {
      return new Response(JSON.stringify({ error: "Dados do cliente incompletos (documento)." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tel.length < 10) {
      return new Response(JSON.stringify({ error: "Dados do cliente incompletos (telefone)." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: feeRow, error: feeErr } = await supabase
      .from("customs_fee_pix")
      .select("pedido_codigo, pix_code, pix_qr_base64, paid_at")
      .eq("codigo_rastreio", codigoRastreio)
      .maybeSingle();

    if (feeErr) {
      console.error("[check-pix-status] customs_fee_pix:", feeErr.message);
    }

    let taxaPaga = Boolean(feeRow?.paid_at);

    if (!taxaPaga && feeRow?.pedido_codigo) {
      const { data: gw } = await supabase
        .from("pix_gateway_payments")
        .select("status")
        .eq("id_transaction", feeRow.pedido_codigo)
        .maybeSingle();
      if (gw?.status === "paid") {
        taxaPaga = true;
        await supabase
          .from("customs_fee_pix")
          .update({ paid_at: new Date().toISOString() })
          .eq("codigo_rastreio", codigoRastreio);
      }
    }

    if (taxaPaga) {
      return new Response(JSON.stringify({ taxaPaga: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingCode = typeof feeRow?.pix_code === "string" ? feeRow.pix_code.trim() : "";
    const existingB64 = typeof feeRow?.pix_qr_base64 === "string" ? feeRow.pix_qr_base64.trim().replace(/\s/g, "") : "";

    if (existingCode && ensureCharge === false) {
      return new Response(
        JSON.stringify({
          taxaPaga: false,
          pixCode: existingCode,
          qrCodeBase64: existingB64,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ensureCharge) {
      return new Response(JSON.stringify({ taxaPaga: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingCode) {
      return new Response(
        JSON.stringify({
          taxaPaga: false,
          pixCode: existingCode,
          qrCodeBase64: existingB64,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("MANGOFY_API_KEY")?.trim() || Deno.env.get("ROYALBANKING_API_KEY")?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key do gateway não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const feeBrl = parseFloat(Deno.env.get("CUSTOMS_FEE_AMOUNT_BRL")?.trim() || "47.90");
    const amount = Number.isFinite(feeBrl) && feeBrl >= 1 ? feeBrl : 47.9;
    const amountCents = Math.round(amount * 100);

    const callbackUrl =
      Deno.env.get("PIX_WEBHOOK_CALLBACK_URL")?.trim() ||
      Deno.env.get("MANGOFY_PIX_CALLBACK_URL")?.trim() ||
      `${supabaseUrl.replace(/\/$/, "")}/functions/v1/pix-webhook`;

    const upstream = await fetch("https://api.royalbanking.com.br/v1/gateway/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "api-key": apiKey,
        amount,
        client: {
          name: lead.nome.trim(),
          document: doc,
          telefone: tel,
          email: lead.email.trim().toLowerCase(),
        },
        callbackUrl,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("[check-pix-status] gateway:", data);
      return new Response(JSON.stringify({ error: "Falha ao gerar Pix da taxa.", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentCode = String(data.paymentCode ?? data.payment_code ?? data.copyPaste ?? data.emv ?? "").trim();
    const rawB64 = data.paymentCodeBase64 ?? data.payment_code_base64 ?? data.qrCodeBase64 ?? data.qrcode;
    const paymentCodeBase64 = rawB64 == null ? "" : String(rawB64).trim().replace(/\s/g, "");
    const idTxRaw = data.idTransaction ?? data.id_transaction ?? data.transactionId;
    const idTransaction = idTxRaw == null ? "" : String(idTxRaw).trim();

    if (!paymentCode || !idTransaction) {
      return new Response(JSON.stringify({ error: "Resposta do gateway incompleta." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertErr } = await supabase.from("customs_fee_pix").upsert(
      {
        codigo_rastreio: codigoRastreio,
        pedido_codigo: idTransaction,
        pix_code: paymentCode,
        pix_qr_base64: paymentCodeBase64,
        amount_cents: amountCents,
        paid_at: null,
      },
      { onConflict: "codigo_rastreio" }
    );

    if (upsertErr) {
      console.error("[check-pix-status] upsert customs_fee_pix:", upsertErr.message);
      return new Response(JSON.stringify({ error: "Erro ao gravar cobrança." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        taxaPaga: false,
        pixCode: paymentCode,
        qrCodeBase64: paymentCodeBase64,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[check-pix-status]", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
