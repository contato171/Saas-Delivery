export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  // 1. Pega os parâmetros que o Facebook mandou na URL
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const tenantId = searchParams.get("state"); // Nós mandamos o ID do lojista escondido no "state"
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saas-delivery-seven.vercel.app";

  // Se o lojista clicou em "Cancelar" na tela do Facebook
  if (error) {
    return NextResponse.redirect(`${baseUrl}/painel?erro_meta=${error}`);
  }

  if (!code || !tenantId) {
    return NextResponse.redirect(`${baseUrl}/painel?erro_meta=dados_ausentes`);
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${baseUrl}/api/meta/callback`;

  try {
    // 2. Troca o "código" temporário pela Chave Mestra (Access Token)
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Erro Meta API:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/painel?erro_meta=falha_token`);
    }

    const accessToken = tokenData.access_token;

    // 3. Salva a Chave Mestra no banco de dados do lojista
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { error: dbError } = await supabaseAdmin
      .from("tenant_integrations")
      .upsert({ 
        tenant_id: tenantId, 
        facebook_access_token: accessToken 
      }, { onConflict: 'tenant_id' }); 

    if (dbError) {
       console.error("Erro DB:", dbError);
       return NextResponse.redirect(`${baseUrl}/painel?erro_meta=falha_db`);
    }

    // 4. Redireciona o lojista de volta para o painel dele com sucesso!
    // Você pode ler esse "sucesso_meta=true" no frontend para mostrar um alerta verdinho se quiser
    return NextResponse.redirect(`${baseUrl}/painel?sucesso_meta=true`);

  } catch (err) {
    console.error("Erro Callback Meta:", err);
    return NextResponse.redirect(`${baseUrl}/painel?erro_meta=excecao`);
  }
}