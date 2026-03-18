import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // A MÁGICA: Inicializa as chaves apenas quando a requisição acontece
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Falha na verificação do Webhook:`, err.message);
    return new NextResponse(`Erro no Webhook: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata || !metadata.tenantId) {
      return new NextResponse("Metadados ausentes", { status: 400 });
    }

    const tenantId = metadata.tenantId;

    try {
      if (metadata.type === "topup") {
        const valorRecarga = parseFloat(metadata.amount || "0");
        
        const { data: tenant } = await supabaseAdmin
          .from("tenants")
          .select("wallet_balance")
          .eq("id", tenantId)
          .single();

        const saldoAtual = tenant?.wallet_balance || 0;
        const novoSaldo = saldoAtual + valorRecarga;

        await supabaseAdmin
          .from("tenants")
          .update({ wallet_balance: novoSaldo })
          .eq("id", tenantId);

      } else if (metadata.type === "subscription") {
        await supabaseAdmin
          .from("tenants")
          .update({ plan_tier: "pro" }) 
          .eq("id", tenantId);
      }

    } catch (dbError: any) {
      console.error("Erro ao atualizar banco:", dbError.message);
      return new NextResponse("Erro interno", { status: 500 });
    }
  }

  return new NextResponse("OK", { status: 200 });
}