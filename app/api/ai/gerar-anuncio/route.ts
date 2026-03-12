import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { produtos, tenantName } = await request.json();
    const nomes = produtos.map((p: any) => p.name).join(", ");
    const precoBaixo = Math.min(...produtos.map((p: any) => Number(p.price))).toFixed(2).replace('.', ',');

    const prompt = `Você é um copywriter. Restaurante: "${tenantName}". Produtos: ${nomes}. Preço: R$ ${precoBaixo}. 
    Crie um anúncio de alta conversão. Responda APENAS um JSON puro com: hook, body e cta.`;

    // LISTA DE MODELOS POR ORDEM DE COMPATIBILIDADE PARA CONTAS NOVAS
    const modelosParaTestar = [
      "claude-3-5-sonnet-latest",
      "claude-3-haiku-latest",
      "claude-3-sonnet-latest"
    ];

    let data;
    let sucesso = false;

    for (const model of modelosParaTestar) {
      console.log(`Tentando motor: ${model}`);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      data = await response.json();

      if (!data.error) {
        sucesso = true;
        break; 
      }
      console.log(`Falha no modelo ${model}: ${data.error.message}`);
    }

    if (!sucesso) {
      return NextResponse.json({ 
        error: "A Anthropic ainda não liberou modelos para sua conta nova. Isso leva até 24h após o primeiro crédito. Detalhe: " + (data?.error?.message || "Erro desconhecido")
      }, { status: 500 });
    }

    const textoDaIA = data.content[0].text;
    const jsonLimpo = textoDaIA.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(jsonLimpo));

  } catch (error: any) {
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}