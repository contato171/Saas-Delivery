"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function DashboardInicio({ tenant }: { tenant: any }) {
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({ faturamento: 0, pedidos: 0, ticketMedio: 0 });
  const [itensMaisVendidos, setItensMaisVendidos] = useState<any[]>([]);

  // Pegando a data atual formatada
  const dataAtual = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  useEffect(() => {
    async function carregarMetricasReais() {
      if (!tenant?.id) return;

      // 1. Busca todos os pedidos dessa loja e os itens dentro deles
      const { data: pedidosData } = await supabase
        .from("orders")
        .select(`
          total_amount,
          status,
          order_items ( product_name, quantity, unit_price )
        `)
        .eq("tenant_id", tenant.id);

      if (pedidosData) {
        let faturamentoTotal = 0;
        let totalPedidos = pedidosData.length;
        let contagemProdutos: Record<string, { qtd: number, valor: number }> = {};

        pedidosData.forEach(pedido => {
          // Soma o faturamento (Pode filtrar por status 'concluido' no futuro)
          faturamentoTotal += Number(pedido.total_amount);

          // Conta os produtos mais vendidos
          pedido.order_items?.forEach((item: any) => {
            if (contagemProdutos[item.product_name]) {
              contagemProdutos[item.product_name].qtd += item.quantity;
              contagemProdutos[item.product_name].valor += (item.quantity * item.unit_price);
            } else {
              contagemProdutos[item.product_name] = { 
                qtd: item.quantity, 
                valor: (item.quantity * item.unit_price) 
              };
            }
          });
        });

        const ticket = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

        // Transforma o objeto em lista, ordena do mais vendido pro menos e pega os Top 5
        const rankingProdutos = Object.entries(contagemProdutos)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 5);

        setMetricas({ faturamento: faturamentoTotal, pedidos: totalPedidos, ticketMedio: ticket });
        setItensMaisVendidos(rankingProdutos);
      }
      setLoading(false);
    }

    carregarMetricasReais();
  }, [tenant]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cabeçalho de Boas Vindas */}
      <div>
        <p className="text-zinc-500 text-sm">{dataAtual}</p>
        <h1 className="text-3xl font-bold text-zinc-900 mt-1">Boas vindas, {tenant?.name || "Lojista"}</h1>
      </div>

      {/* Grid Superior: Card da Loja + Banner Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-zinc-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-inner">
              {tenant?.name?.charAt(0).toUpperCase() || "L"}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-lg">{tenant?.name}</h3>
              <p className="text-blue-600 text-sm font-medium">Plano PRO Ativo</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-default">
              📄 Link da loja
            </button>
            <a href={`/${tenant?.slug}`} target="_blank" className="flex items-center justify-center gap-2 border border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2 px-4 rounded-lg text-sm transition-colors">
              ↗ Acessar Vitrine
            </a>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-6 text-white shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 max-w-sm">
            <h2 className="text-2xl font-bold mb-2">Com o Pagamento Online o dinheiro cai na hora</h2>
            <p className="text-blue-100 text-sm mb-4">40% dos consumidores já estão preferindo usar o pagamento online no delivery.</p>
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-md">
              Ativar pagamento online
            </button>
          </div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 right-20 -mb-10 w-32 h-32 bg-orange-400 opacity-20 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* Visão Geral (Métricas Reais) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Visão Geral de Vendas</h2>
          <div className="flex flex-wrap gap-2">
            <button className="bg-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded-md">Histórico Completo</button>
          </div>
        </div>

        {loading ? (
          <div className="h-32 flex items-center justify-center text-zinc-500 animate-pulse">Calculando métricas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-5 shadow-sm">
              <p className="text-zinc-600 text-sm font-medium mb-1">Faturamento Total</p>
              <h3 className="text-3xl font-black text-zinc-900">R$ {metricas.faturamento.toFixed(2).replace(".", ",")}</h3>
            </div>
            <div className="border border-zinc-100 bg-zinc-50 rounded-xl p-5 shadow-sm">
              <p className="text-zinc-600 text-sm font-medium mb-1">Total de Pedidos</p>
              <h3 className="text-3xl font-black text-zinc-900">{metricas.pedidos}</h3>
            </div>
            <div className="border border-zinc-100 bg-zinc-50 rounded-xl p-5 shadow-sm">
              <p className="text-zinc-600 text-sm font-medium mb-1">Ticket Médio</p>
              <h3 className="text-3xl font-black text-zinc-900">R$ {metricas.ticketMedio.toFixed(2).replace(".", ",")}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Grid Inferior: Tabelas e Desempenho */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tabela de Itens (Dados Reais) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-900">Itens Mais Vendidos</h2>
          </div>

          {loading ? (
             <div className="py-10 text-center text-zinc-500">Carregando itens...</div>
          ) : itensMaisVendidos.length === 0 ? (
             <div className="py-10 text-center text-zinc-500 bg-zinc-50 rounded-lg">Nenhum produto vendido ainda.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-sm text-zinc-500">
                  <th className="pb-3 font-medium">Produto</th>
                  <th className="pb-3 font-medium text-right">Valor Gerado</th>
                  <th className="pb-3 font-medium text-right">Quant.</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {itensMaisVendidos.map((item, index) => (
                  <tr key={index} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="py-3 text-zinc-800 font-medium">{item.name}</td>
                    <td className="py-3 text-right text-zinc-600">R$ {item.valor.toFixed(2).replace(".", ",")}</td>
                    <td className="py-3 text-right font-black text-zinc-900">{item.qtd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Avaliações e NPS (Ainda visual aguardando o CRM) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-900">Satisfação do cliente</h2>
          </div>
          <div className="text-center py-10 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex-1 flex flex-col items-center justify-center">
             <span className="text-4xl mb-3">⭐</span>
             <h3 className="font-bold text-zinc-800">Avaliações em Breve</h3>
             <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">As avaliações começarão a aparecer aqui quando o módulo de CRM estiver ativo.</p>
          </div>
        </div>

      </div>
    </div>
  );
}