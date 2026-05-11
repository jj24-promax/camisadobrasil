import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateMockTrackingCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const num4 = Math.floor(1000 + Math.random() * 9000).toString();
  const char = letters.charAt(Math.floor(Math.random() * letters.length));
  const num3 = Math.floor(100 + Math.random() * 900).toString();
  return `BR${num4}${char}${num3}BR`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    let { amount, amountCents, productSummary, shippingSummary, client, leadId } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const isUpsell = !client && leadId;

    if (isUpsell) {
      const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (lead) {
        client = {
          name: lead.nome,
          document: lead.cpf,
          telefone: lead.telefone,
          email: lead.email,
        };
      } else {
        return new Response(JSON.stringify({ error: "Lead não encontrado." }), { status: 404, headers: corsHeaders });
      }
    }

    // AppSec: Basic Input Validation to prevent massive payloads and missing data
    if (!client || !client.name || !client.document || !client.email) {
      return new Response(JSON.stringify({ error: "Dados do cliente inválidos ou ausentes." }), { status: 400, headers: corsHeaders });
    }
    if (client.name.length > 150 || client.email.length > 150) {
      return new Response(JSON.stringify({ error: "Payload excedeu o tamanho permitido." }), { status: 400, headers: corsHeaders });
    }

    // AppSec: Prevenção contra Price Tampering (Fraude do PIX de R$ 1,00)
    if (isUpsell && amount < 19.90) {
      console.warn(`[AppSec] Tentativa de fraude de preço detectada no Upsell: ${amount}`);
      return new Response(JSON.stringify({ error: "Valor da transação inválido ou adulterado." }), { status: 400, headers: corsHeaders });
    }
    if (!isUpsell && amount < 47.50) {
      console.warn(`[AppSec] Tentativa de fraude de preço detectada no Checkout: ${amount}`);
      return new Response(JSON.stringify({ error: "Valor do pedido adulterado. Transação bloqueada." }), { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("ROYALBANKING_API_KEY")?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key não configurada." }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const callbackUrl = "https://ulrigywayovxuyiktnlr.supabase.co/functions/v1/pix-webhook";
    const trackingCode = generateMockTrackingCode();
    
    if (!leadId) {
      leadId = crypto.randomUUID();
    }

    const upstream = await fetch("https://api.royalbanking.com.br/v1/gateway/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "api-key": apiKey,
        amount,
        client: {
          name: client.name,
          document: client.document.replace(/\D/g, ""),
          telefone: client.telefone.replace(/\D/g, ""),
          email: client.email,
        },
        callbackUrl,
      }),
    });

    const data = await upstream.json();
    
    if (!upstream.ok) {
      console.error("[pix-create] Erro na gateway:", data);
      return new Response(JSON.stringify(data), { 
        status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const paymentCode = String(data.paymentCode ?? data.payment_code ?? data.copyPaste ?? data.emv ?? "").trim();
    const rawB64 = data.paymentCodeBase64 ?? data.payment_code_base64 ?? data.qrCodeBase64 ?? data.qrcode;
    const paymentCodeBase64 = rawB64 == null ? "" : String(rawB64).trim().replace(/\s/g, "");
    const idTxRaw = data.idTransaction ?? data.id_transaction ?? data.transactionId;
    const idTransaction = idTxRaw == null ? undefined : String(idTxRaw);

    if (idTransaction) {
      if (!isUpsell) {
        const { error: leadError } = await supabase.from("leads").insert({
          id: leadId,
          nome: client.name.trim(),
          email: client.email.trim().toLowerCase(),
          telefone: client.telefone.replace(/\D/g, ""),
          produto_interesse: productSummary || "Camisa do Brasil",
          status: "em_contato",
          cpf: client.document.replace(/\D/g, ""),
          codigo_rastreio: trackingCode,
          cidade: client.address?.cidade,
          estado: client.address?.estado,
          cep: client.address?.cep,
          endereco: client.address?.endereco,
          numero: client.address?.numero,
          complemento: client.address?.complemento,
          bairro: client.address?.bairro,
        });
        if (leadError) console.error("[pix-create] Erro ao inserir Lead:", leadError);
      }

      const base = `${productSummary} · Pix`;
      const line = shippingSummary ? `${base} · Entrega: ${shippingSummary}` : base;
      
      const { error: vendaError } = await supabase.from("vendas").insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        cliente_nome: client.name,
        produto: line,
        valor: amountCents || Math.round(amount * 100),
        status_pagamento: "pendente",
        pedido_codigo: idTransaction,
      });
      if (vendaError) console.error("[pix-create] Erro ao inserir Venda:", vendaError);
    }

    return new Response(JSON.stringify({ paymentCode, paymentCodeBase64, idTransaction, trackingCode, leadId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("[pix-create] Erro interno:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar Pix" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})