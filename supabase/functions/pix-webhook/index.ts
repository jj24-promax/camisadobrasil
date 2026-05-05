import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function pickTransactionId(r: any): string | undefined {
  const raw = r.externalReference ?? r.external_reference ?? r.idTransaction ?? r.id_transaction ?? r.transactionId ?? r.transaction_id ?? r.paymentId ?? r.payment_id ?? r.id ?? r.txId ?? r.tx_id;
  if (raw == null || raw === "") return undefined;
  return String(raw).trim();
}

function isPaid(status: string, event: string) {
  const s = norm(status);
  const e = norm(event);
  if (s.includes('saque')) return false; 
  if (s === 'paid' || s.includes('pago') || s.includes('approved') || s.includes('success')) return true;
  if (e === 'payment.confirmed' || (e.includes('paid') && !e.includes('saque'))) return true;
  return false;
}

function isFailed(status: string, event: string) {
  const s = norm(status);
  const e = norm(event);
  if (s.includes('saque')) return false;
  if (s.includes('fail') || s.includes('cancel') || s.includes('erro') || s.includes('rejeit')) return true;
  if (e.includes('fail') || e.includes('cancel')) return true;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const secret =
      Deno.env.get("MANGOFY_WEBHOOK_SECRET")?.trim() ||
      Deno.env.get("ROYALBANKING_WEBHOOK_SECRET")?.trim() ||
      "";
    const authHeader =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      req.headers.get("x-mangofy-webhook-secret")?.trim() ||
      req.headers.get("x-webhook-secret")?.trim() ||
      req.headers.get("x-royal-webhook-secret")?.trim();
    
    if (secret && authHeader !== secret) {
      console.warn("[AppSec] Bloqueado: Tentativa de spoofing no webhook (Assinatura inválida).");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const idTransaction = pickTransactionId(payload);
    
    console.log(`[pix-webhook] Processando webhook para transação: ${idTransaction || 'Desconhecida'}`);

    const status = norm(payload.status ?? payload.payment_status ?? payload.state ?? payload.providerStatus);
    const event = norm(payload.event);

    const paid = isPaid(status, event);
    const failed = isFailed(status, event);

    if (idTransaction) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (paid) {
        console.log(`[pix-webhook] Marcando tx ${idTransaction} como PAGO`);
        
        const { error: logErr } = await supabase.from("pix_gateway_payments").upsert({
          id_transaction: idTransaction,
          status: "paid",
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id_transaction" });
        if (logErr) console.error("[pix-webhook] Erro logs:", logErr);

        const { data: vendaData, error: vendaErr } = await supabase
          .from("vendas")
          .update({ status_pagamento: "pago" })
          .eq("pedido_codigo", idTransaction)
          .select("id, lead_id, valor");
        if (vendaErr) console.error("[pix-webhook] Erro Vendas:", vendaErr);

        if (vendaData && vendaData.length > 0 && vendaData[0].lead_id) {
           const { error: leadErr } = await supabase
            .from("leads")
            .update({ status: "convertido" })
            .eq("id", vendaData[0].lead_id)
            .select("id")
            .maybeSingle();
           
           if (leadErr) console.error("[pix-webhook] Erro Leads:", leadErr);
        }

        const { error: customsErr } = await supabase
          .from("customs_fee_pix")
          .update({ paid_at: new Date().toISOString() })
          .eq("pedido_codigo", idTransaction);
        if (customsErr) console.error("[pix-webhook] Erro customs_fee_pix:", customsErr.message);
        
      } else if (failed) {
        console.log(`[pix-webhook] Marcando tx ${idTransaction} como FALHADO`);
        
        await supabase.from("pix_gateway_payments").upsert({
          id_transaction: idTransaction,
          status: "failed",
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id_transaction" });

        await supabase
          .from("vendas")
          .update({ status_pagamento: "cancelado" })
          .eq("pedido_codigo", idTransaction);
      }
    }

    return new Response(JSON.stringify(200), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error("[pix-webhook] Erro interno:", err);
    return new Response(JSON.stringify(200), { status: 200, headers: corsHeaders });
  }
})