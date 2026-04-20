import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// O ID DA SUA TAXA DE 1,9%
const PRICE_ID_TAXA_USO = "price_1TM7bJBhOcnQDlI7Qebz8q0l"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, type, amount, priceId, paymentMethod } = body;

    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (!tenant) return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });

    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email || "contato@nexusdelivery.com.br",
        name: tenant.name,
        metadata: { tenant_id: tenantId }
      });
      customerId = customer.id;
      await supabase.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenantId);
    }

    // Mapeamento dinâmico do método de pagamento
    let paymentMethodTypes = ["card"];
    let paymentMethodOptions = {};
    let billingAddressCollection: "auto" | "required" = "auto";

    if (paymentMethod === "pix") {
      paymentMethodTypes = ["pix"];
    } else if (paymentMethod === "boleto") {
      paymentMethodTypes = ["boleto"];
      paymentMethodOptions = { boleto: { expires_after_days: 3 } };
      billingAddressCollection = "required"; 
    }

    // =========================================================
    // TIPO 1: PAGAMENTO DA FATURA MANUAL (Taxas Acumuladas)
    // =========================================================
    if (type === "invoice" || type === "topup") {
      const amountInCents = Math.round(amount * 100);
      if (amountInCents < 200) return NextResponse.json({ error: "O valor mínimo de pagamento exigido pela Stripe é R$ 2,00." }, { status: 400 });
      
      try {
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: paymentMethodTypes as any,
          ...(paymentMethod === "boleto" && { payment_method_options: paymentMethodOptions }),
          billing_address_collection: billingAddressCollection as any,
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: `Fatura Nexus Delivery - ${tenant.name}`,
                  description: "Acerto das taxas de transação da plataforma.",
                },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexusdeliveryapp.com.br'}/painel?aba=financeiro&sucesso=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexusdeliveryapp.com.br'}/painel?aba=financeiro&cancelado=true`,
        });
        return NextResponse.json({ url: session.url });
      } catch (stripeErr: any) {
        if (stripeErr.message.includes("payment_method_types")) {
            return NextResponse.json({ error: "O PIX ou Boleto ainda não estão ativados no seu painel da Stripe. Ative-os em Configurações > Métodos de Pagamento na Stripe." }, { status: 500 });
        }
        throw stripeErr;
      }
    }

    // =========================================================
    // TIPO 2: ASSINATURA DO PLANO (Mensal/Anual + Taxa 1,9%)
    // =========================================================
    if (type === "subscription") {
      if (!priceId) return NextResponse.json({ error: "ID do plano não informado." }, { status: 400 });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: paymentMethodTypes as any,
        ...(paymentMethod === "boleto" && { payment_method_options: paymentMethodOptions }),
        billing_address_collection: billingAddressCollection as any,
        line_items: [
          { price: priceId, quantity: 1 }, // O valor do plano fixo (R$497 ou Anual)
          { price: PRICE_ID_TAXA_USO }     // O Medidor de 1,9%
        ],
        mode: "subscription",
        // REMOVIDO O TRIAL AQUI PARA PERMITIR PIX E BOLETO
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexusdeliveryapp.com.br'}/painel?aba=financeiro&sucesso=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexusdeliveryapp.com.br'}/painel?aba=financeiro&cancelado=true`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: `Tipo de cobrança não reconhecido: ${type}` }, { status: 400 });

  } catch (error: any) {
    console.error("Erro Geral na API:", error);
    return NextResponse.json({ error: "Falha ao processar pagamento. " + error.message }, { status: 500 });
  }
}