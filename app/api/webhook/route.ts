import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
// Importe o seu cliente do Supabase aqui (ajuste o caminho se necessário)
import { createClient } from "@supabase/supabase-js"; 

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event;

  try {
    // A Stripe exige esta verificação de segurança para garantir que foi ela quem mandou o aviso
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Erro na assinatura do Webhook:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Se o pagamento foi concluído com sucesso...
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const tenantId = session.metadata?.tenantId; // Pegamos aquele ID que mandámos no botão

    if (tenantId) {
      // Como estamos no Backend, precisamos de uma chave de ADMIN do Supabase para forçar a atualização
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // A chave secreta (service_role) do Supabase
      );

      // Descobrir qual plano ele comprou baseando-se no valor pago ou no ID do produto
      // Para simplificar, vamos colocar como "pro" para testar
      
      const { error } = await supabaseAdmin
        .from("tenants")
        .update({ 
          plan_tier: "pro", // Aqui você atualiza o plano do cliente
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