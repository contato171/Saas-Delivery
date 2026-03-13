export const dynamic = 'force-dynamic';
import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { priceId, tenantId, customerEmail } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Price ID é obrigatório" }, { status: 400 });
    }

    // A MÁGICA AQUI: Se a variável do .env falhar, ele força o localhost! 
    // Fim do erro "explicit scheme".
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    // Criando a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], 
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        tenantId: tenantId,
      },
      // Usando o baseUrl blindado
      success_url: 'https://saas-delivery-seven.vercel.app/painel?sucesso=true',
      cancel_url: 'https://saas-delivery-seven.vercel.app/planos',
      customer_email: customerEmail || undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no Stripe Checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}