"use client";

import { CheckCircle2, Rocket, Zap, Crown } from "lucide-react";

export default function PlanosPricing() {
  const planos = [
    {
      nome: "Essencial",
      preco: "147",
      descricao: "Perfeito para profissionalizar o atendimento e parar de pagar comissões abusivas.",
      icone: <Zap className="text-zinc-400" size={24} />,
      cor: "border-zinc-200",
      botao: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
      features: [
        "Cardápio Digital Interativo",
        "Gestor de Pedidos no Balcão",
        "Checkout Integrado (Pix/Cartão)",
        "Link na Bio e QR Code na Mesa",
        "Sem taxas por pedido"
      ]
    },
    {
      nome: "Tração",
      preco: "347",
      descricao: "Para negócios que querem fazer o cliente voltar a comprar toda a semana.",
      icone: <Rocket className="text-blue-600" size={24} />,
      cor: "border-blue-600 shadow-xl relative scale-105",
      botao: "bg-blue-600 text-white hover:bg-blue-700",
      popular: true,
      features: [
        "Tudo do plano Essencial",
        "CRM e Histórico de Clientes VIP",
        "Disparo de Ofertas no WhatsApp",
        "Recuperação de Carrinho Abandonado",
        "Programa de Fidelidade/Cupons"
      ]
    },
    {
      nome: "PRO",
      preco: "797",
      descricao: "A sua própria agência de marketing automatizada no piloto automático.",
      icone: <Crown className="text-purple-600" size={24} />,
      cor: "border-purple-200",
      botao: "bg-purple-600 text-white hover:bg-purple-700",
      features: [
        "Tudo do plano Tração",
        "Automação de Tráfego Meta Ads (2 cliques)",
        "Dayparting e Pixel Inteligente",
        "Copywriter IA (Textos que vendem)",
        "Dashboard de ROI em Anúncios"
      ]
    }
  ];

  const handleAssinar = async (planoNome: string) => {
    // ATENÇÃO: Cole aqui os IDs reais que começam com "price_" que você pegou no painel da Stripe
    const priceIds: any = {
      "Essencial": "price_1TAEMYBno2bIxVzmSfVfITTo",
"Tração": "price_1TAEMqBno2bIxVzmxp0LjrWV",
"Pro": "price_1TAEN8Bno2bIxVzmonY4z6oq"
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: priceIds[planoNome],
          tenantId: "teste_123", // Provisório apenas para testar o checkout
        })
      });
      
      const data = await res.json();
      
      if (data.url) {
        // Redireciona para o checkout da Stripe
        window.location.href = data.url; 
      } else {
        // Agora ele vai gritar o erro na tela se algo falhar
        alert("Erro da Stripe: " + (data.error || "Falha desconhecida."));
        console.error("Detalhes do erro:", data);
      }
    } catch (err) {
      alert("Erro de comunicação com o servidor. O Backend não respondeu.");
      console.error(err);
    }
  };

  return (
    <div className="py-24 bg-zinc-50 font-sans" id="planos">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-black text-zinc-900 mb-4 tracking-tight">
            Escolha a máquina de vendas ideal para o seu negócio
          </h2>
          <p className="text-lg text-zinc-600">
            Cancele quando quiser. Sem contratos de fidelidade. Sem taxas escondidas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {planos.map((plano) => (
            <div 
              key={plano.nome} 
              className={`bg-white rounded-3xl p-8 border-2 ${plano.cor} flex flex-col h-full`}
            >
              {plano.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">
                  MAIS ESCOLHIDO
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-zinc-50 rounded-xl">{plano.icone}</div>
                <h3 className="text-xl font-black text-zinc-900">{plano.nome}</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-zinc-500 font-medium mb-4 min-h-[40px]">
                  {plano.descricao}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-400">R$</span>
                  <span className="text-5xl font-black text-zinc-900 tracking-tight">{plano.preco}</span>
                  <span className="text-zinc-500 font-medium">/mês</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plano.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={20} className={plano.popular ? "text-blue-600 shrink-0" : plano.nome === 'PRO' ? "text-purple-600 shrink-0" : "text-zinc-400 shrink-0"} />
                    <span className="text-zinc-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleAssinar(plano.nome)}
                className={`w-full py-4 rounded-xl font-bold transition-all shadow-sm ${plano.botao}`}
              >
                Assinar Plano {plano.nome}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}