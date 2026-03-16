// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  TrendingUp, Target, DollarSign, ShoppingBag, 
  Flame, ArrowRight, ShieldCheck, Facebook, PiggyBank,
  Edit3, CheckCircle2, Zap
} from "lucide-react";

export default function DashboardInicio({ tenant }: { tenant: any }) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Gamificação e Metas
  const [metaMensal, setMetaMensal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const salva = localStorage.getItem(`@saas_meta_${tenant.id}`);
      return salva ? parseFloat(salva) : 10000; // Meta padrão inicial
    }
    return 10000;
  });
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState(metaMensal.toString());
  const [progressoAnimado, setProgressoAnimado] = useState(0);

  useEffect(() => {
    buscarDadosGerais();
  }, [tenant.id]);

  const buscarDadosGerais = async () => {
    setLoading(true);
    
    // Busca apenas pedidos do mês atual que não foram cancelados
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("created_at", primeiroDiaMes)
      .neq("status", "cancelado")
      .neq("status", "excluido");

    if (data) setPedidos(data);
    setLoading(false);
  };

  // Cálculos Financeiros
  const faturamentoTotal = pedidos.reduce((acc, p) => acc + Number(p.total_amount), 0);
  const totalPedidos = pedidos.length;
  const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;
  
  // Animação da Barra de Progresso
  const porcentagemMeta = Math.min((faturamentoTotal / metaMensal) * 100, 100);
  
  useEffect(() => {
    if (!loading) {
      setTimeout(() => setProgressoAnimado(porcentagemMeta), 300);
    }
  }, [loading, porcentagemMeta]);

  const salvarMeta = () => {
    const valor = parseFloat(novaMeta.replace(",", "."));
    if (valor > 0) {
      setMetaMensal(valor);
      localStorage.setItem(`@saas_meta_${tenant.id}`, valor.toString());
    }
    setEditandoMeta(false);
  };

  // ==========================================
  // CÁLCULOS DO TERMÔMETRO DE ECONOMIA (GATILHO DE AVERSÃO À PERDA)
  // Taxa média iFood Logística Própria: 12% + 3.2% (transação) + R$ 130/mês
  // ==========================================
  const taxaIfoodPedidos = faturamentoTotal * 0.152;
  const taxaIfoodMensalidade = 130;
  const custoIfoodTotal = taxaIfoodPedidos + taxaIfoodMensalidade;
  const economiaReal = faturamentoTotal > 0 ? custoIfoodTotal : 0;

  // ==========================================
  // INTELIGÊNCIA DE TRÁFEGO (META ADS PROJECTION)
  // Custo médio por aquisição (CPA) estimado no delivery: R$ 5,00 a R$ 8,00
  // ==========================================
  const cpaEstimado = 6.50; 
  const faltaParaMeta = Math.max(metaMensal - faturamentoTotal, 0);
  const pedidosNecessarios = ticketMedio > 0 ? Math.ceil(faltaParaMeta / ticketMedio) : Math.ceil(faltaParaMeta / 35);
  const investimentoSugerido = pedidosNecessarios * cpaEstimado;

  // Verifica se teve vendas hoje
  const vendasHoje = pedidos.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length;

  if (loading) {
    return <div className="h-full flex items-center justify-center animate-pulse text-zinc-400 font-bold">Calculando seus lucros...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 text-zinc-900 font-sans max-w-7xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Boas vindas, {tenant.name}</h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            {vendasHoje > 0 ? (
              <span className="flex items-center gap-1 text-orange-600 font-bold"><Flame size={16}/> Sua loja está pegando fogo hoje!</span>
            ) : (
              "Vamos bater a meta do mês?"
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <a href={`/${tenant.slug}`} target="_blank" className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 shadow-sm text-sm">
             Acessar Vitrine <ArrowRight size={16}/>
          </a>
        </div>
      </div>

      {/* BLOCO 1: A META GAMIFICADA */}
      <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
          <div className="w-full md:w-2/3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-black text-xl flex items-center gap-2"><Target className="text-blue-500"/> Progresso do Mês</h2>
              {!editandoMeta ? (
                <button onClick={() => setEditandoMeta(true)} className="text-zinc-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"><Edit3 size={14}/> Editar Meta</button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-xs">R$</span>
                  <input type="number" value={novaMeta} onChange={(e) => setNovaMeta(e.target.value)} className="bg-zinc-800 text-white text-sm px-2 py-1 rounded border border-zinc-700 outline-none w-24 focus:border-blue-500" />
                  <button onClick={salvarMeta} className="text-emerald-400 hover:text-emerald-300"><CheckCircle2 size={18}/></button>
                </div>
              )}
            </div>
            
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-black text-white tracking-tighter">R$ {faturamentoTotal.toFixed(2).replace(".", ",")}</span>
              <span className="text-zinc-400 font-medium mb-1">/ R$ {metaMensal.toFixed(2).replace(".", ",")}</span>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full transition-all duration-1500 ease-out relative"
                style={{ width: `${progressoAnimado}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            <p className="text-blue-400 text-sm font-bold mt-3">{porcentagemMeta.toFixed(1)}% alcançado. Faltam R$ {faltaParaMeta.toFixed(2).replace(".", ",")}!</p>
          </div>

          <div className="w-full md:w-1/3 bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-5">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">Resumo Rápido</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-zinc-300 text-sm">Pedidos Totais</span><span className="text-white font-black">{totalPedidos}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-300 text-sm">Ticket Médio</span><span className="text-white font-black">R$ {ticketMedio.toFixed(2).replace(".", ",")}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 2: O TERMÔMETRO DE ECONOMIA (AVERSÃO À PERDA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10"></div>
          <h3 className="font-black text-zinc-900 text-lg flex items-center gap-2 mb-1"><PiggyBank className="text-emerald-500"/> O "Imposto" que você não pagou</h3>
          <p className="text-zinc-500 text-sm mb-6">Comparativo do faturamento atual se fosse vendido em outras plataformas.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 relative overflow-hidden">
              <span className="absolute text-[100px] right-2 bottom-0 opacity-5">🍔</span>
              <p className="text-red-800 text-xs font-bold uppercase tracking-wider mb-1">Se fosse no iFood</p>
              <p className="text-2xl font-black text-red-600 mb-2">- R$ {custoIfoodTotal.toFixed(2).replace(".", ",")}</p>
              <p className="text-[10px] text-red-700 leading-tight">Taxa estimada de 15.2% (Plano Básico + Pagamento) + R$ 130 mensais.</p>
            </div>
            
            <div className="bg-emerald-500 rounded-xl p-5 text-white shadow-lg shadow-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full"></div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ShieldCheck size={14}/> Lucro Protegido</p>
              <p className="text-3xl font-black mb-1">+ R$ {economiaReal.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-emerald-100 font-medium">Você economizou isso usando o seu próprio sistema.</p>
            </div>
          </div>
        </div>

        {/* BLOCO 3: INTELIGÊNCIA DE TRÁFEGO E ROAS */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col">
          <h3 className="font-black text-zinc-900 text-lg flex items-center gap-2 mb-1"><Zap className="text-purple-600"/> Inteligência de Vendas</h3>
          <p className="text-zinc-500 text-sm mb-6">O que falta para bater a meta.</p>

          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 mb-4">
              <p className="text-xs text-zinc-500 font-bold uppercase mb-1 text-center">Faltam exatamente</p>
              <p className="text-3xl font-black text-zinc-900 text-center">{pedidosNecessarios} <span className="text-sm font-bold text-zinc-500">Pedidos</span></p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
               <p className="text-xs text-blue-800 font-bold uppercase mb-2 flex items-center justify-center gap-1"><Facebook size={14}/> Sugestão de Anúncio</p>
               <p className="text-center text-sm text-blue-900 font-medium">Invista cerca de <strong className="text-blue-700">R$ {investimentoSugerido.toFixed(2).replace(".", ",")}</strong> na Meta hoje para atrair esses pedidos e bater sua meta!</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}