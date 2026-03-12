export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ajuste o caminho se o seu supabase.ts estiver noutra pasta

export async function GET(request: Request) {
  try {
    // 1. Pegamos os dados que a Meta mandou no URL (O código de autorização e o ID do seu cliente)
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tenantId = searchParams.get('state'); 
    
    // Se o cliente cancelou o login, redirecionamos para o painel com erro
    if (!code || !tenantId) {
      return NextResponse.redirect(new URL('/painel?erro=login_cancelado', request.url));
    }

    // 🚨 COLOQUE AQUI AS SUAS CHAVES DA META (Da Etapa 1)
    const APP_ID = "4223060334506886"; 
    const APP_SECRET = "ca87aaa2e1e3489f7d6ae1fe6a254639"; 
    
    // A rota exata onde estamos
    const REDIRECT_URI = `${new URL(request.url).origin}/api/meta/callback`;

    // ==========================================
    // 2. TROCAR O "CÓDIGO" PELO "ACCESS TOKEN" OFICIAL
    // ==========================================
    const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${APP_SECRET}&code=${code}`);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Erro ao gerar token: ${tokenData.error.message}`);
    }

    const accessToken = tokenData.access_token;

    // ==========================================
    // 3. GUARDAR O TOKEN NO BANCO DE DADOS (SUPABASE)
    // ==========================================
    // O seu sistema vai guardar este token ligado ao ID do restaurante
    const { error: dbError } = await supabase
      .from('tenant_integrations')
      .upsert({ 
        tenant_id: tenantId, 
        facebook_access_token: accessToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' }); // Atualiza se já existir

    if (dbError) throw new Error(`Erro no BD: ${dbError.message}`);

    // ==========================================
    // 4. DEVOLVER O CLIENTE AO PAINEL COM SUCESSO
    // ==========================================
    return NextResponse.redirect(new URL('/painel?sucesso=meta_conectado', request.url));

  } catch (error: any) {
    console.error("❌ ERRO NO CALLBACK META:", error);
    return NextResponse.redirect(new URL(`/painel?erro=${encodeURIComponent(error.message)}`, request.url));
  }
}