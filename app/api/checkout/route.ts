export const dynamic = 'force-dynamic';
import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Recebendo o paymentMethod do frontend
    const { type, tenantId, priceId, amount, paymentMethod } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID é obrigatório" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saas-delivery-seven.vercel.app";

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Lojista não encontrado" }, { status: 404 });
    }

    let stripeCustomerId = tenant.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from("tenants")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", tenantId);
    }

    let sessionConfig: any = {
      customer: stripeCustomerId,
      success_url: `${baseUrl}/painel?sucesso=true`,
      cancel_url: `${baseUrl}/painel?cancelado=true`,
      client_reference_id: tenantId,
    };

    if (type === "subscription") {
      if (!priceId) return NextResponse.json({ error: "Price ID ausente para assinatura" }, { status: 400 });
      
      sessionConfig = {
        ...sessionConfig,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { type: "subscription", tenantId: tenantId },
      };
    } 
    else if (type === "topup") {
      if (!amount) return NextResponse.json({ error: "Valor ausente para recarga" }, { status: 400 });

      // Lógica separada: É Pix ou Cartão?
      const isPix = paymentMethod === "pix";

      sessionConfig = {
        ...sessionConfig,
        mode: "payment",
        payment_method_types: isPix ? ["pix"] : ["card"], 
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Recarga de Carteira (Taxas)",
                description: "Saldo pré-pago para processamento de pedidos.",
              },
              unit_amount: Math.round(amount * 100), 
            },
            quantity: 1,
          },
        ],
        metadata: { type: "topup", tenantId: tenantId, amount: amount.toString() },
      };

      // Só pede para salvar cobrança futura (off_session) SE FOR CARTÃO
      if (!isPix) {
        sessionConfig.payment_intent_data = {
          setup_future_usage: "off_session", 
        };
      }

    } else {
      return NextResponse.json({ error: "Tipo de cobrança inválido" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no Stripe Checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}