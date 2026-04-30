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

async function hashSHA256(text: string) {
  const msgUint8 = new TextEncoder().encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const secret = Deno.env.get("ROYALBANKING_WEBHOOK_SECRET");
    const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-webhook-secret")?.trim() || req.headers.get("x-royal-webhook-secret")?.trim();
    
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

        let leadEmail = "";
        let leadPhone = "";
        let valueCents = vendaData?.[0]?.valor || 0;

        if (vendaData && vendaData.length > 0 && vendaData[0].lead_id) {
           const { data: leadData, error: leadErr } = await supabase
            .from("leads")
            .update({ status: "convertido" })
            .eq("id", vendaData[0].lead_id)
            .select("email, telefone")
            .maybeSingle();
           
           if (leadErr) console.error("[pix-webhook] Erro Leads:", leadErr);
           if (leadData) {
             leadEmail = leadData.email;
             leadPhone = leadData.telefone;
           }
        }
        
        // CAPI Purchase Event
        try {
          const hashedEmail = leadEmail ? await hashSHA256(leadEmail) : undefined;
          const hashedPhone = leadPhone ? await hashSHA256(leadPhone.replace(/\D/g, '')) : undefined;

          const fbPayload = {
              data: [
                  {
                      event_name: "Purchase",
                      event_time: Math.floor(Date.now() / 1000),
                      action_source: "website",
                      user_data: {
                          em: hashedEmail ? [hashedEmail] : undefined,
                          ph: hashedPhone ? [hashedPhone] : undefined,
                      },
                      custom_data: {
                          currency: "BRL",
                          value: valueCents > 0 ? valueCents / 100 : 0
                      }
                  }
              ]
          };

          const fbToken = "EAAU1iftq7uUBRXQ1dp8SV02oj8P1bMppFJEarZAuZCSOoF6oqu0QORBBpxGavr5AOPlRv99rZBVcelsf7kTBTXXpGDVF2ZCaGdVcsJ5lidrZAKcA2Fn0EYemF09b1IqKlKjQmsZCALTFwOBBOMktmcaJ3IUm1lbq5tZAVEq8ZB3nXuKi7tHrZBIprfGpCFZBkzQhSXewZDZD";
          const pixelId = "1603071560994242";

          await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${fbToken}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fbPayload)
          });
        } catch (fbErr) {
            console.error("[pix-webhook] Erro ao enviar CAPI Purchase:", fbErr);
        }
        
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