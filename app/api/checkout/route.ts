export const dynamic = 'force-dynamic';
import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inicializa o Supabase como ADMIN (Para conseguir ler/salvar o stripe_customer_id)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { type, tenantId, priceId, amount } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID é obrigatório" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saas-delivery-seven.vercel.app";

    // 1. Busca os dados do Lojista no banco
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Lojista não encontrado" }, { status: 404 });
    }

    // 2. Gerencia o Cliente na Stripe (Cria um se não existir para salvar o cartão)
    let stripeCustomerId = tenant.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      stripeCustomerId = customer.id;

      // Salva o ID da Stripe no banco de dados
      await supabaseAdmin
        .from("tenants")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", tenantId);
    }

    // 3. Monta a sessão base
    let sessionConfig: any = {
      customer: stripeCustomerId,
      success_url: `${baseUrl}/painel?sucesso=true`,
      cancel_url: `${baseUrl}/painel?cancelado=true`,
      client_reference_id: tenantId,
    };

    // 4. Divide a lógica entre Assinatura e Recarga de Carteira
    if (type === "subscription") {
      if (!priceId) return NextResponse.json({ error: "Price ID ausente para assinatura" }, { status: 400 });
      
      sessionConfig = {
        ...sessionConfig,
        mode: "subscription",
        payment_method_types: ["card"], // Assinatura principal no cartão
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { type: "subscription", tenantId: tenantId },
      };
    } 
    else if (type === "topup") {
      if (!amount) return NextResponse.json({ error: "Valor (amount) ausente para recarga" }, { status: 400 });

      sessionConfig = {
        ...sessionConfig,
        mode: "payment",
        payment_method_types: ["card", "pix"], // Recarga da Carteira aceita PIX!
        
        // A MÁGICA DA RECARGA AUTOMÁTICA: 
        // Se ele pagar com cartão, pede permissão para salvar o cartão para cobranças futuras "off_session"
        payment_intent_data: {
          setup_future_usage: "off_session", 
        },

        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Recarga de Carteira (Taxas Delivery IA)",
                description: "Saldo pré-pago para processamento de pedidos.",
              },
              unit_amount: Math.round(amount * 100), // Stripe exige o valor em centavos (R$ 50 = 5000)
            },
            quantity: 1,
          },
        ],
        metadata: { type: "topup", tenantId: tenantId, amount: amount.toString() },
      };
    } else {
      return NextResponse.json({ error: "Tipo de cobrança inválido" }, { status: 400 });
    }

    // 5. Cria o Checkout
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no Stripe Checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}