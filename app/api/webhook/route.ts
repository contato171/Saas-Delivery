import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // A MÁGICA: Inicializa as chaves apenas quando a requisição acontece
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2026-02-25.clover",
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

  try {
    // =========================================================================
    // EVENTO 1: CHECKOUT FINALIZADO (Primeira assinatura ou pagamento avulso via PIX/Boleto)
    // =========================================================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Só executa se realmente foi pago (ignora se o boleto apenas foi gerado)
      if (session.payment_status === "paid") {
        // Pega os metadados que nós enviamos lá no checkout/route.ts
        const metadata = session.metadata;
        const tenantId = metadata?.tenant_id || metadata?.tenantId; 
        const tipoPagamento = metadata?.type;

        if (tenantId) {
          if (tipoPagamento === "subscription_upgrade") {
            // Cliente assinou o plano PRO
            await supabaseAdmin.from("tenants").update({ 
              plan_tier: "pro", 
              status: "ativo",
              updated_at: new Date().toISOString()
            }).eq("id", tenantId);
            console.log(`✅ Loja ${tenantId} ativada para PRO com sucesso!`);
          } 
          else if (tipoPagamento === "invoice_payment") {
            // Cliente quitou a fatura em atraso/manual via PIX/Boleto
            await supabaseAdmin.from("tenants").update({ 
              status: "ativo", // Desbloqueia a loja
              updated_at: new Date().toISOString()
            }).eq("id", tenantId);
            console.log(`✅ Fatura quitada! Loja ${tenantId} desbloqueada.`);
          }
        }
      }
    }

    // =========================================================================
    // EVENTO 2: FATURA RECORRENTE PAGA (Débito automático no cartão no fim do mês)
    // =========================================================================
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Localiza a loja através do ID do cliente na Stripe
      const { data: tenant } = await supabaseAdmin.from("tenants").select("id").eq("stripe_customer_id", customerId).single();

      if (tenant) {
        // Fatura debitada com sucesso, garante que a loja está ativa
        await supabaseAdmin.from("tenants").update({
          status: "ativo",
          updated_at: new Date().toISOString()
        }).eq("id", tenant.id);
        console.log(`✅ Débito automático bem sucedido. Loja ${tenant.id} renovada!`);
      }
    }

    // =========================================================================
    // EVENTO 3: PAGAMENTO FALHOU (Cartão sem limite ou Boleto venceu)
    // =========================================================================
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: tenant } = await supabaseAdmin.from("tenants").select("id").eq("stripe_customer_id", customerId).single();

      if (tenant) {
        // Bloqueia a loja imediatamente para não receber mais pedidos
        await supabaseAdmin.from("tenants").update({
          status: "bloqueado"
        }).eq("id", tenant.id);
        console.log(`❌ Fatura não paga. Loja ${tenant.id} bloqueada por inadimplência.`);
      }
    }

    return new NextResponse("OK", { status: 200 });

  } catch (dbError: any) {
    console.error("Erro interno ao processar banco de dados no Webhook:", dbError.message);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}