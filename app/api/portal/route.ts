import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Inicializa a Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { tenantId } = await req.json();

    const { data: tenant } = await supabase.from("tenants").select("stripe_customer_id").eq("id", tenantId).single();
    
    if (!tenant || !tenant.stripe_customer_id) {
      return NextResponse.json({ error: "Cliente não possui registro na Stripe ainda." }, { status: 400 });
    }

    // Cria a sessão do Portal do Cliente da Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexusdeliveryapp.com.br'}/painel?aba=financeiro`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro ao gerar Portal da Stripe:", error);
    return NextResponse.json({ error: "Falha ao acessar portal financeiro." }, { status: 500 });
  }
}