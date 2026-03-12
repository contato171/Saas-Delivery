import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      tenantId, produtos, orcamentoTotal, diasVeiculacao, 
      cidadeMeta, anuncioGerado, accessToken, adAccountId, pageId, 
      instagramId, pixelId, horarioInicio, horarioFim
    } = data;

    if (!accessToken || !adAccountId || !pageId || !pixelId) {
      return NextResponse.json({ error: "Faltam credenciais (Token, Página ou Pixel)." }, { status: 400 });
    }

    const API_VERSION = 'v19.0';
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // ==========================================
    // LÓGICA DE HORÁRIOS (BLINDADA)
    // ==========================================
    let startH = parseInt(horarioInicio.split(':')[0]);
    let endH = parseInt(horarioFim.split(':')[0]);
    let endM = parseInt(horarioFim.split(':')[1]);

    // Arredonda o fim para a próxima hora cheia se for "quebrado" (ex: 23:30 vira 24:00)
    if (endM > 0) {
      endH = endH + 1;
    }

    // Evitar bug se o cliente colocar a MESMA hora de início e fim (ex: 18:00 às 18:00)
    if (startH === endH && endM === 0) {
      endH = startH + 1;
    }

    let adset_schedule = [];
    const todosOsDias = [0, 1, 2, 3, 4, 5, 6];

    // Se a hora de início for menor que a final E a final não ultrapassar as 23h
    if (startH < endH && endH <= 23) {
      adset_schedule.push({ start_minute: startH * 60, end_minute: endH * 60, days: todosOsDias });
    } else {
      // Cenário: Atravessou a meia-noite (Ex: 18:00 às 02:00) OU arredondou para 24h (23:30)
      // A CORREÇÃO MÁGICA: O limite do dia na API é 1440 minutos exatos, e não 1439!
      adset_schedule.push({ start_minute: startH * 60, end_minute: 1440, days: todosOsDias });
      
      let horaVirada = endH % 24;
      if (horaVirada > 0) {
        adset_schedule.push({ start_minute: 0, end_minute: horaVirada * 60, days: todosOsDias });
      }
    }

    // ==========================================
    // 1. CRIAR CAMPANHA DE VENDAS
    // ==========================================
    const campResponse = await fetch(`${BASE_URL}/${actId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `[IA] VENDAS - Delivery - ${cidadeMeta.name} - ${new Date().toLocaleDateString()}`,
        objective: 'OUTCOME_SALES', 
        status: 'PAUSED',
        special_ad_categories: ['NONE'], 
        buying_type: 'AUCTION',          
        is_adset_budget_sharing_enabled: false, 
        access_token: accessToken
      })
    });
    const campanha = await campResponse.json();
    if (campanha.error) throw new Error(`Erro na Campanha: ${campanha.error.message}`);


    // ==========================================
    // 2. CRIAR CONJUNTO DE ANÚNCIOS (Vendas com Horários e Maior Volume)
    // ==========================================
    const budgetCentavos = Math.round(orcamentoTotal * 100);
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + diasVeiculacao);

    const adSetResponse = await fetch(`${BASE_URL}/${actId}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Conjunto - ${cidadeMeta.name} - ${horarioInicio} às ${horarioFim}`,
        campaign_id: campanha.id,
        lifetime_budget: budgetCentavos,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        adset_schedule: adset_schedule, 
        optimization_goal: 'OFFSITE_CONVERSIONS', 
        billing_event: 'IMPRESSIONS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP', // A estratégia de Maior Volume que você quer!
        pacing_type: ['day_parting'], // O SEGREDO REVELADO: Diz à Meta para aceitar os horários sem pedir lances!
        promoted_object: {
          pixel_id: pixelId,
          custom_event_type: 'PURCHASE' 
        },
        status: 'PAUSED',
        targeting: {
          geo_locations: {
            cities: [{ key: cidadeMeta.key, radius: 17, distance_unit: 'kilometer' }]
          },
          age_min: 18,
          age_max: 65,
          publisher_platforms: instagramId ? ['facebook', 'instagram'] : ['facebook']
        },
        access_token: accessToken
      })
    });
    const adset = await adSetResponse.json();
    if (adset.error) throw new Error(`Erro no Conjunto: ${adset.error.error_user_msg || adset.error.message}`);

    // ==========================================
    // 3. CRIAR CRIATIVO (CARROSSEL AUTOMÁTICO PARA IG/FB)
    // ==========================================
    const cartoesCarrossel = produtos.map((prod: any) => {
      let urlImagem = prod.image_url;
      if (!urlImagem || urlImagem.startsWith('blob:') || urlImagem.includes('sua-imagem-padrao')) {
        urlImagem = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop"; 
      }

      return {
        name: prod.name.substring(0, 40),
        description: `R$ ${Number(prod.price).toFixed(2)}`,
        picture: urlImagem,
        link: `https://seusite.com/cardapio/${tenantId}?produto=${prod.id}`,
        call_to_action: {
          type: 'SHOP_NOW',
          value: { link: `https://seusite.com/cardapio/${tenantId}?produto=${prod.id}` }
        }
      };
    });

    const creativeResponse = await fetch(`${BASE_URL}/${actId}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Criativo Carrossel IA`,
        object_story_spec: {
          page_id: pageId,
          // A SOLUÇÃO: Apagámos a linha do instagram_actor_id! 
          // A Meta agora vai encontrar o Instagram automaticamente através da Página do Facebook.
          link_data: {
            link: `https://seusite.com/cardapio/${tenantId}`,
            message: `${anuncioGerado.hook}\n\n${anuncioGerado.body}\n\n${anuncioGerado.cta}`,
            child_attachments: cartoesCarrossel,
            call_to_action: {
              type: 'SHOP_NOW',
              value: { link: `https://seusite.com/cardapio/${tenantId}` }
            }
          }
        },
        access_token: accessToken
      })
    });
    const creative = await creativeResponse.json();
    if (creative.error) {
      throw new Error(`Erro no Criativo: ${creative.error.error_user_msg || creative.error.message}`);
    }


    // ==========================================
    // 4. PUBLICAR ANÚNCIO FINAL (Com rastreio de Pixel)
    // ==========================================
    const adResponse = await fetch(`${BASE_URL}/${actId}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Anúncio Carrossel - IA`,
        adset_id: adset.id,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
        tracking_specs: [
          {
            "action.type": ["offsite_conversion"],
            "fb_pixel": [pixelId]
          }
        ],
        access_token: accessToken
      })
    });
    const anuncio = await adResponse.json();
    
    if (anuncio.error) {
      console.error("❌ ERRO DO ANÚNCIO:", JSON.stringify(anuncio.error, null, 2));
      throw new Error(`Erro ao publicar anúncio: ${anuncio.error.error_user_msg || anuncio.error.message}`);
    }

    return NextResponse.json({ sucesso: true, campanhaId: campanha.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}