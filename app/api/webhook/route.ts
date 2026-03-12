export const dynamic = 'force-dynamic';
import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js"; 

export async function POST(req: Request) {
  const body = await req.text();
  
  // CORREÇÃO: No Next.js mais recente, o headers() precisa de um 'await'
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Erro na assinatura do Webhook:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const tenantId = session.metadata?.tenantId; 

    if (tenantId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! 
      );
      
      const { error } = await supabaseAdmin
        .from("tenants")
        .update({ 
          plan_tier: "pro", 
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq("id", tenantId);

      if (error) {
        console.error("Erro ao atualizar o banco de dados:", error);
      } else {
        console.log(`✅ Sucesso! Plano liberado para o tenant: ${tenantId}`);
      }
    }
  }

  return new NextResponse("OK", { status: 200 });
}