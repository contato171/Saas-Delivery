export const dynamic = 'force-dynamic';

import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js"; 

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("Stripe-Signature") as string;

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || "segredo_falso"
      );
    } catch (error: any) {
      return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const tenantId = session.metadata?.tenantId; 

      if (tenantId) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "https://falso.supabase.co",
          process.env.SUPABASE_SERVICE_ROLE_KEY || "chave_falsa" 
        );
        
        await supabaseAdmin
          .from("tenants")
          .update({ 
            plan_tier: "pro", 
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription
          })
          .eq("id", tenantId);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    return new NextResponse("Erro interno", { status: 500 });
  }
}