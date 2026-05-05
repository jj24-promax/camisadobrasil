import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { generateTimeline } from "@/utils/tracking";

// Padrão de rastreio esperado (Ex: BR1234A567BR)
const TRACKING_REGEX = /^BR\d{4}[A-Z]\d{3}BR$/i;

export async function GET(req: Request) {
  // AppSec: Prevenir que terceiros embarquem esta rota como oráculo em outros sites
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Acesso bloqueado por política de segurança." }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim().toUpperCase();

  if (!code || code.length > 15) {
    return NextResponse.json({ error: "Código de rastreio inválido ou ausente." }, { status: 400 });
  }

  if (!TRACKING_REGEX.test(code)) {
    // Retorna genérico para dificultar enumeração
    return NextResponse.json({ error: "Código não encontrado no sistema." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Serviço indisponível no momento." }, { status: 500 });
  }

  try {
    // Tarpit defensivo simples: adiciona um atraso para tornar o brute force massivo inviável
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Procura no Supabase para saber para onde a encomenda vai
    const { data: leadData, error } = await admin
      .from("leads")
      .select("cidade, estado, bairro, created_at")
      .eq("codigo_rastreio", code)
      .maybeSingle();

    if (error || !leadData) {
      return NextResponse.json({ error: "Código não encontrado na base de dados dos Correios." }, { status: 404 });
    }

    let destCity = "Rio de Janeiro";
    let destState = "RJ";
    let destBairro = "";
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    if (leadData.cidade) destCity = leadData.cidade;
    if (leadData.estado) destState = leadData.estado;
    if (typeof leadData.bairro === "string" && leadData.bairro.trim()) {
      destBairro = leadData.bairro.trim();
    }
    if (leadData.created_at) startDate = new Date(leadData.created_at);

    /** Alinhar com o site principal: mesma assinatura + taxaPaga quando existir coluna no futuro */
    const taxaPaga = false;

    const timeline = generateTimeline(
      code,
      destCity,
      destState,
      destBairro,
      startDate.toISOString(),
      taxaPaga
    );

    return NextResponse.json({
      code,
      destCity,
      destState,
      timeline
    });

  } catch (error) {
    return NextResponse.json({ error: "Erro interno ao processar rastreio." }, { status: 500 });
  }
}