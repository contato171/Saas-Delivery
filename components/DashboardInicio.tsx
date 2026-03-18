// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  TrendingUp, Target, DollarSign, ShoppingBag, 
  Flame, ArrowRight, ShieldCheck, Facebook, PiggyBank,
  Edit3, CheckCircle2, Zap, Eye, MousePointerClick, Trophy,
  Activity, CalendarClock, Loader2
} from "lucide-react";

// Motor de Animação Numérica
function useAnimatedValue(endValue: number, duration: number = 1500, trigger: boolean = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger || endValue === 0) return;
    let startTime: number;
    let animationFrame: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); 
      setValue(endValue * easeProgress);
      if (progress < 1) animationFrame = requestAnimationFrame(step);
      else setValue(endValue);
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration, trigger]);
  return value;
}

// Componente Visual do Gráfico de Fundo (Sparkline)
const Sparkline = ({ pathD }: { pathD: string }) => (
  <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none opacity-60">
    <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L100,30 L0,30 Z`} fill="url(#grad)" />
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function DashboardInicio({ tenant }: { tenant: any }) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [itensVendidos, setItensVendidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [metaMensal, setMetaMensal] = useState<number>(15000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("15000");

  useEffect(() => {
    setIsMounted(true);
    const salva = localStorage.getItem(`@saas_meta_${tenant.id}`);
    if (salva) {
      setMetaMensal(parseFloat(salva));
      setNovaMeta(salva);
    }
    buscarDadosGerais();
  }, [tenant.id]);

  const buscarDadosGerais = async () => {
    setLoading(true);
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("tenant_id", tenant.id)
        .gte("created_at", primeiroDiaMes)
        .neq("status", "cancelado")
        .neq("status", "excluido");

      if (ordersData) {
        setPedidos(ordersData);
        let todosItens: any[] = [];
        ordersData.forEach(pedido => {
          if (pedido.order_items && Array.isArray(pedido.order_items)) {
            todosItens.push(...pedido.order_items);
          }
        });
        setItensVendidos(todosItens);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const faturamentoTotal = pedidos.reduce((acc, p) => acc + Number(p.total_amount), 0);
  const totalPedidos = pedidos.length;
  const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;
  const visitasEstimadas = totalPedidos > 0 ? Math.floor(totalPedidos * 12.5) : 124; 
  const taxaConversao = visitasEstimadas > 0 ? (totalPedidos / visitasEstimadas) * 100 : 0;

  const triggerAnim = !loading && isMounted;
  const animFaturamento = useAnimatedValue(faturamentoTotal, 2000, triggerAnim);
  const animPedidos = useAnimatedValue(totalPedidos, 1500, triggerAnim);
  const animVisitas = useAnimatedValue(visitasEstimadas, 1800, triggerAnim);
  const animConversao = useAnimatedValue(taxaConversao, 1500, triggerAnim);
  const animTicket = useAnimatedValue(ticketMedio, 1500, triggerAnim);
  
  // CÁLCULO AJUSTADO: Usa 15% como média de mercado de plataformas terceiras
  const animEconomia = useAnimatedValue(faturamentoTotal * 0.15, 2000, triggerAnim);

  const progressoPorcentagem = metaMensal > 0 ? Math.min((faturamentoTotal / metaMensal) * 100, 100) : 0;
  const progressoAnimado = useAnimatedValue(progressoPorcentagem, 2000, triggerAnim);

  let nivelAtual = "Iniciante"; 
  let corNivel = "text-zinc-500 bg-zinc-100 border-zinc-200";
  if (progressoPorcentagem >= 100) { nivelAtual = "Diamante 💎"; corNivel = "text-cyan-700 bg-cyan-100 border-cyan-200"; }
  else if (progressoPorcentagem >= 75) { nivelAtual = "Ouro 🥇"; corNivel = "text-amber-700 bg-amber-100 border-amber-200"; }
  else if (progressoPorcentagem >= 50) { nivelAtual = "Prata 🥈"; corNivel = "text-slate-700 bg-slate-200 border-slate-300"; }
  else if (progressoPorcentagem >= 25) { nivelAtual = "Bronze 🥉"; corNivel = "text-orange-800 bg-orange-100 border-orange-200"; }

  const salvarMeta = () => {
    const valor = parseFloat(novaMeta.replace(",", "."));
    if (valor > 0) { 
      setMetaMensal(valor); 
      localStorage.setItem(`@saas_meta_${tenant.id}`, valor.toString()); 
    }
    setEditandoMeta(false);
  };

  const custoOutrasPlataformas = animEconomia;

  const rankingMap: Record<string, { quant: number, receita: number }> = {};
  itensVendidos.forEach(item => {
    if (!rankingMap[item.product_name]) rankingMap[item.product_name] = { quant: 0, receita: 0 };
    rankingMap[item.product_name].quant += item.quantity;
    rankingMap[item.product_name].receita += (item.quantity * item.unit_price);
  });
  const topProdutos = Object.keys(rankingMap).map(nome => ({ nome, ...rankingMap[nome] })).sort((a, b) => b.receita - a.receita).slice(0, 3);

  let diaPico = "Sexta-feira"; 
  let horaPico = "20:00";
  if (pedidos.length > 0) {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const horasMap: Record<string, number> = {};
    pedidos.forEach(p => { 
      if (p.created_at) { 
        const data = new Date(p.created_at); 
        const chave = `${dias[data.getDay()]} às ${data.getHours()}h`; 
        horasMap[chave] = (horasMap[chave] || 0) + 1; 
      }
    });
    const picoReal = Object.keys(horasMap).sort((a, b) => horasMap[b] - horasMap[a])[0];
    if (picoReal) { 
      diaPico = picoReal.split(" às ")[0]; 
      horaPico = picoReal.split(" às ")[1]; 
    }
  }

  const radius = 60; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isNaN(progressoAnimado) ? circumference : circumference - (progressoAnimado / 100) * circumference;

  if (!isMounted || loading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 text-zinc-900 font-sans max-w-[1400px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-zinc-500 font-medium text-sm mb-1">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
          <h1 className="text-3xl font-black tracking-tight">Boas vindas, {tenant.name}</h1>
        </div>
        <div className="flex gap-3">
          <a href={`/${tenant.slug}`} target="_blank" className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-sm text-sm">
             Acessar Vitrine <ArrowRight size={16}/>
          </a>
        </div>
      </div>

      {/* ZONA 1: FUNIL DE CONVERSÃO COM GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-zinc-500 font-bold text-xs uppercase flex items-center gap-1.5"><Eye size={14}/> Visitas no Cardápio</p>
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">Estimativa</span>
          </div>
          <div className="relative z-10 pb-4">
            <h3 className="text-3xl font-black text-zinc-900">{Math.floor(animVisitas).toLocaleString('pt-BR')}</h3>
            <p className="text-emerald-600 text-xs font-bold mt-1 flex items-center gap-1"><TrendingUp size={12}/> Tráfego Aquecido</p>
          </div>
          <Sparkline pathD="M0,25 C20,20 40,30 60,15 C80,5 90,10 100,5" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-zinc-500 font-bold text-xs uppercase flex items-center gap-1.5"><ShoppingBag size={14}/> Pedidos Recebidos</p>
          </div>
          <div className="relative z-10 pb-4">
            <h3 className="text-3xl font-black text-zinc-900">{Math.floor(animPedidos)}</h3>
            <p className="text-emerald-600 text-xs font-bold mt-1 flex items-center gap-1"><TrendingUp size={12}/> Vendas Concluídas</p>
          </div>
          <Sparkline pathD="M0,20 C30,25 40,5 60,10 C80,15 90,5 100,2" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-zinc-500 font-bold text-xs uppercase flex items-center gap-1.5"><Target size={14}/> Taxa de Conversão</p>
          </div>
          <div className="relative z-10 pb-4">
            <h3 className="text-3xl font-black text-zinc-900">{animConversao.toFixed(1)}%</h3>
            <p className="text-emerald-600 text-xs font-bold mt-1 flex items-center gap-1"><Activity size={12}/> Visitante ➡️ Cliente</p>
          </div>
          <Sparkline pathD="M0,15 C20,10 50,20 70,5 C85,15 95,5 100,8" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-zinc-500 font-bold text-xs uppercase flex items-center gap-1.5"><DollarSign size={14}/> Faturamento & Ticket</p>
          </div>
          <div className="flex justify-between items-end relative z-10 pb-4">
            <div>
              <p className="text-xs text-zinc-400 font-bold mb-0.5">Faturamento</p>
              <h3 className="text-2xl font-black text-emerald-600">R$ {animFaturamento.toFixed(2).replace('.', ',')}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400 font-bold mb-0.5">Ticket Médio</p>
              <h3 className="text-xl font-black text-zinc-900">R$ {animTicket.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>
          <Sparkline pathD="M0,28 C20,10 40,25 60,10 C80,15 90,0 100,5" />
        </div>
      </div>

      {/* ZONA 2 E 3: GAMIFICAÇÃO E COFRE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* GAMIFICAÇÃO DA META */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#f4f4f5" strokeWidth="12" />
              <circle cx="70" cy="70" r={radius} fill="transparent" stroke="url(#gradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-300 ease-out" />
              <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#0ea5e9" /></linearGradient></defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-zinc-900 leading-none">{progressoAnimado.toFixed(0)}%</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Concluído</span>
            </div>
          </div>

          <div className="flex-1 w-full z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${corNivel}`}>Nível: {nivelAtual}</div>
              {!editandoMeta ? (
                <button onClick={() => setEditandoMeta(true)} className="text-zinc-400 hover:text-indigo-600 text-xs font-bold flex items-center gap-1 transition-colors"><Edit3 size={14}/> Editar Meta</button>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
                  <span className="text-zinc-500 text-xs font-bold pl-2">R$</span>
                  <input type="number" value={novaMeta} onChange={(e) => setNovaMeta(e.target.value)} className="bg-white text-zinc-900 text-sm font-bold px-2 py-1 rounded border border-zinc-300 outline-none w-24 focus:border-indigo-500" />
                  <button onClick={salvarMeta} className="text-emerald-600 hover:text-emerald-700 pr-1"><CheckCircle2 size={18}/></button>
                </div>
              )}
            </div>

            <h3 className="text-4xl font-black text-zinc-900 tracking-tighter mb-1">R$ {animFaturamento.toFixed(2).replace('.', ',')}</h3>
            <p className="text-zinc-500 font-medium text-sm mb-6">de R$ {metaMensal.toFixed(2).replace('.', ',')} estabelecidos para o mês.</p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1 flex items-center gap-1"><Facebook size={14}/> Sugestão da IA</p>
                <p className="text-sm text-indigo-900">Para bater a meta, invista <strong className="font-black">R$ 50</strong> hoje no Meta Ads.</p>
              </div>
              <a href="/painel" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-md">Criar Campanha</a>
            </div>
          </div>
        </div>

        {/* O COFRE ANTI-TAXAS */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 md:p-8 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div>
            <h3 className="font-black text-emerald-50 text-sm uppercase tracking-wider mb-1 flex items-center gap-2"><ShieldCheck size={18}/> Cofre de Taxas</h3>
            <p className="text-emerald-100 text-xs mb-6">Quanto você estaria perdendo em outras plataformas de delivery</p>
            <div className="flex items-end gap-2 mb-2"><span className="text-5xl font-black tracking-tighter leading-none">R$ {custoOutrasPlataformas.toFixed(2).replace('.', ',')}</span></div>
            <p className="text-emerald-100 font-bold text-sm bg-black/10 inline-block px-3 py-1 rounded-lg">Protegidos este mês 💸</p>
          </div>
          <div className="mt-8 bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex justify-between items-center mb-2"><span className="text-xs text-emerald-100 font-medium">Em outras plataformas:</span><span className="text-sm font-black text-red-300">- R$ {custoOutrasPlataformas.toFixed(2).replace('.', ',')}</span></div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10"><span className="text-xs text-emerald-100 font-medium">No seu sistema próprio:</span><span className="text-sm font-black text-emerald-300">R$ 0,00 (100% Seu)</span></div>
          </div>
        </div>

      </div>

      {/* ZONA 4: INTELIGÊNCIA DE DADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-zinc-900 text-lg flex items-center gap-2"><CalendarClock size={20} className="text-purple-600"/> Mapa de Calor</h3>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-2 py-1 rounded-md">Inteligência</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-6 text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-full mb-3"><Flame size={24}/></div>
            <h4 className="text-lg font-black text-zinc-900 mb-1">Seu pico de vendas é {diaPico} às {horaPico}.</h4>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">Ative suas campanhas de tráfego pago cerca de 2 horas antes do seu pico para maximizar resultados.</p>
          </div>
          <div className="space-y-2">
            <div className="flex text-[10px] font-bold text-zinc-400 uppercase"><div className="w-12"></div><div className="flex-1 flex justify-between px-2"><span>18h</span><span>20h</span><span>22h</span><span>00h</span></div></div>
            {['Sex', 'Sáb', 'Dom'].map((dia, i) => (
              <div key={dia} className="flex items-center gap-2"><span className="w-12 text-xs font-bold text-zinc-600">{dia}</span>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  <div className={`h-8 rounded-md ${i === 0 ? 'bg-purple-200' : 'bg-purple-100'}`}></div>
                  <div className={`h-8 rounded-md ${i === 0 ? 'bg-purple-600 shadow-lg shadow-purple-600/30' : 'bg-purple-400'}`}></div>
                  <div className={`h-8 rounded-md ${i === 0 ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                  <div className={`h-8 rounded-md ${i === 0 ? 'bg-purple-100' : 'bg-purple-200'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-zinc-900 text-lg flex items-center gap-2"><Trophy size={20} className="text-amber-500"/> Top Campeões</h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-md">Ranking</span>
          </div>
          {topProdutos.length === 0 ? ( <div className="text-center py-10 text-zinc-500 font-medium">Nenhuma venda registrada neste mês ainda.</div> ) : (
            <div className="space-y-4">
              {topProdutos.map((prod, index) => (
                <div key={prod.nome} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>{index + 1}º</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-zinc-900 text-sm truncate">{prod.nome}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{prod.quant} unidades vendidas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-600 text-sm">R$ {prod.receita.toFixed(2).replace('.', ',')}</p>
                    <a href="/painel" className="text-[10px] font-bold text-indigo-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 justify-end"><Zap size={10}/> Impulsionar</a>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 pt-6 border-t border-zinc-100">
             <a href="/painel" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md">Ir para Marketing IA <ArrowRight size={16}/></a>
          </div>
        </div>
      </div>
    </div>
  );
}