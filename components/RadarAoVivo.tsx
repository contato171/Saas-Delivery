// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Activity, Eye, ShoppingCart, CreditCard, DollarSign, Clock, Bike, Facebook, Megaphone, MousePointerClick, Loader2 } from "lucide-react";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });

export default function RadarAoVivo({ tenant }: { tenant: any }) {
  const [metricas, setMetricas] = useState({
    visitantes: 0,
    carrinhos: 0,
    checkouts: 0,
    vendasHoje: 0,
    receitaHoje: 0
  });

  const [eventosLog, setEventosLog] = useState<any[]>([]);
  const [visitantesAtivos, setVisitantesAtivos] = useState<Record<string, any>>({});
  
  const [campanhasAtivas, setCampanhasAtivas] = useState<any[]>([]);
  const [gastoAdsHoje, setGastoAdsHoje] = useState(0);
  const [tempoMedioGeral, setTempoMedioGeral] = useState(0);
  const [metricasEntregadores, setMetricasEntregadores] = useState<any[]>([]);

  const centroPadrao = [-17.7289, -46.1661]; 
  const [mapCenter, setMapCenter] = useState<[number, number]>(centroPadrao);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. SINCRONIZAÇÃO COM O BANCO DE DADOS (RECEITA E LOGÍSTICA)
  useEffect(() => {
    if (!tenant) return;

    const carregarDadosDoDia = async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioDoDia = hoje.toISOString();

      try {
        const { data: orders } = await supabase.from('orders').select('*').eq('tenant_id', tenant.id).gte('created_at', inicioDoDia);
        
        let receitaTotal = 0;
        let vendasEntregues = 0;
        let tempoTotalGeral = 0;
        let pedidosComTempo = 0;
        const mapaMotoboys: Record<string, { entregas: number, tempoTotal: number }> = {};

        if (orders) {
          orders.forEach(p => {
            const status = p.status?.toLowerCase().trim() || "";
            
            // SÓ CONTA RECEITA E VENDA SE ESTIVER ENTREGUE OU CONCLUIDO
            if (status === 'entregue' || status === 'concluido') {
              receitaTotal += Number(p.total_amount || 0);
              vendasEntregues++;

              // CÁLCULO DE TEMPO: Prioriza delivered_at, senão usa updated_at
              const momentoFinal = p.delivered_at || p.updated_at;
              if (momentoFinal && p.created_at) {
                const diffMs = new Date(momentoFinal).getTime() - new Date(p.created_at).getTime();
                let tempoMin = Math.round(diffMs / 60000);
                
                // Trava anti-bug para testes ultra-rápidos
                if (tempoMin <= 0 && diffMs > 0) tempoMin = 1;

                if (tempoMin > 0) {
                  tempoTotalGeral += tempoMin;
                  pedidosComTempo++;

                  const entregador = p.motoboy || "Sem Entregador";
                  if (!mapaMotoboys[entregador]) mapaMotoboys[entregador] = { entregas: 0, tempoTotal: 0 };
                  mapaMotoboys[entregador].entregas++;
                  mapaMotoboys[entregador].tempoTotal += tempoMin;
                }
              }
            }
          });
        }

        // B) Buscar Meta Ads
        const { data: integracao } = await supabase.from('tenant_integrations').select('facebook_access_token').eq('tenant_id', tenant.id).maybeSingle();
        if (integracao?.facebook_access_token && tenant.meta_ad_account_id) {
          const token = integracao.facebook_access_token;
          const actId = tenant.meta_ad_account_id.startsWith('act_') ? tenant.meta_ad_account_id : `act_${tenant.meta_ad_account_id}`;
          const hojeMeta = new Date().toISOString().split('T')[0];
          const res = await fetch(`https://graph.facebook.com/v19.0/${actId}/campaigns?fields=id,name,status,insights.time_range({"since":"${hojeMeta}","until":"${hojeMeta}"}){spend,clicks}&access_token=${token}`);
          const metaData = await res.json();
          
          if (metaData.data) {
            let gastoTotal = 0;
            const campanhasAtivasMeta = metaData.data.filter((c: any) => c.status === 'ACTIVE').map((c: any) => {
                const ins = c.insights?.data?.[0] || {};
                const spend = Number(ins.spend || 0);
                gastoTotal += spend;
                return { nome: c.name, gasto: spend, cliques: Number(ins.clicks || 0) };
            });
            setCampanhasAtivas(campanhasAtivasMeta);
            setGastoAdsHoje(gastoTotal);
          }
        }

        setMetricas(prev => ({ ...prev, receitaHoje: receitaTotal, vendasHoje: vendasEntregues }));
        setTempoMedioGeral(pedidosComTempo > 0 ? Math.round(tempoTotalGeral / pedidosComTempo) : 0);
        
        const arrayMotoboys = Object.keys(mapaMotoboys).map(nome => ({
          nome,
          entregas: mapaMotoboys[nome].entregas,
          tempoMedio: Math.round(mapaMotoboys[nome].tempoTotal / mapaMotoboys[nome].entregas)
        }));
        setMetricasEntregadores(arrayMotoboys.sort((a, b) => a.tempoMedio - b.tempoMedio));

      } catch (err) {
        console.error("Erro radar:", err);
      }
    };
    
    carregarDadosDoDia();
    const refreshData = setInterval(carregarDadosDoDia, 30000); 
    return () => clearInterval(refreshData);
  }, [tenant]);

  // 2. WEBSOCKET: REAL-TIME (VISITANTES NO MAPA E LOG)
  useEffect(() => {
    if (!tenant) return;
    const canal = supabase.channel(`radar_${tenant.id}`);

    canal
      .on('broadcast', { event: 'cliente_acao' }, (payload) => {
        const dado = payload.payload;
        
        if (dado.id) {
           setVisitantesAtivos(prev => {
             const userId = dado.id; 
             const novaLat = dado.lat || prev[userId]?.lat;
             const novaLng = dado.lng || prev[userId]?.lng;

             return {
               ...prev,
               [userId]: { lat: novaLat, lng: novaLng, ultimaAcao: Date.now(), tipo: dado.tipo === 'ping' ? 'view' : dado.tipo }
             };
           });
        }

        if (dado.tipo === 'ping') return; 

        setEventosLog(prev => {
          if (prev.length > 0 && prev[0].msg === dado.mensagem && prev[0].tipo === dado.tipo) return prev;
          const newLog = [{ id: Math.random().toString(36).substr(2, 9), msg: dado.mensagem, tipo: dado.tipo, tempo: 'Agora' }, ...prev];
          return newLog.slice(0, 15); 
        });

        // Alerta sonoro apenas para vendas
        if (dado.tipo === 'purchase') tocarSomCash();
      })
      .subscribe();

    const interval = setInterval(() => {
       const agora = Date.now();
       setVisitantesAtivos(prev => {
         const novoEstado = { ...prev };
         let mudou = false;
         Object.keys(novoEstado).forEach(id => {
           if (agora - novoEstado[id].ultimaAcao > 30000) { 
             delete novoEstado[id];
             mudou = true;
           }
         });
         return mudou ? novoEstado : prev;
       });
    }, 5000); 

    return () => {
      supabase.removeChannel(canal);
      clearInterval(interval);
    };
  }, [tenant]);

  useEffect(() => {
    const ativos = Object.values(visitantesAtivos);
    setMetricas(m => ({ 
      ...m, 
      visitantes: ativos.length,
      carrinhos: ativos.filter(v => v.tipo === 'cart').length,
      checkouts: ativos.filter(v => v.tipo === 'checkout').length
    }));
  }, [visitantesAtivos]);

  const tocarSomCash = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}
  };

  const getCorPorTipo = (tipo: string) => {
    if (tipo === 'view') return '#6366f1'; 
    if (tipo === 'cart') return '#f59e0b'; 
    if (tipo === 'checkout') return '#f97316'; 
    if (tipo === 'purchase') return '#10b981'; 
    return '#8b5cf6';
  };

  return (
    <div className="space-y-6 font-sans pb-20 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
             <span className="relative flex h-3 w-3 mr-1">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
             </span>
             Radar Ao Vivo
           </h1>
           <p className="text-zinc-500 mt-1 text-sm">Acompanhe o funil de vendas, localização e inteligência logística.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
           <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Eye size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Visitantes Agora</p><p className="text-3xl font-black text-zinc-900">{metricas.visitantes}</p></div>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
           <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><ShoppingCart size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">No Carrinho (Agora)</p><p className="text-3xl font-black text-zinc-900">{metricas.carrinhos}</p></div>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
           <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><CreditCard size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">No Checkout (Agora)</p><p className="text-3xl font-black text-zinc-900">{metricas.checkouts}</p></div>
        </div>
        <div className="bg-emerald-600 border border-emerald-700 p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-md">
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-transparent pointer-events-none"></div>
           <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 z-10"><DollarSign size={24}/></div>
           <div className="z-10"><p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Receita (Entregues)</p><p className="text-3xl font-black text-white">R$ {metricas.receitaHoje.toFixed(2).replace('.', ',')}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden h-[500px] relative shadow-sm flex flex-col">
          <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur border border-zinc-200 px-4 py-2 rounded-xl shadow-sm">
             <p className="text-xs font-bold flex items-center gap-2 text-zinc-700">
               <Activity size={14} className="text-indigo-600"/> Mapeamento Vivo
             </p>
          </div>
          
          {isMounted ? (
            <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; CartoDB' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              {Object.values(visitantesAtivos).map((cliente, i) => (
                cliente.lat && cliente.lng && (
                  <CircleMarker key={i} center={[cliente.lat, cliente.lng]} radius={8} pathOptions={{ fillColor: getCorPorTipo(cliente.tipo), color: '#ffffff', weight: 2, fillOpacity: 0.8 }}>
                    <div className="animate-ping absolute inset-0 rounded-full bg-inherit opacity-75"></div>
                  </CircleMarker>
                )
              ))}
            </MapContainer>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50"><Loader2 className="animate-spin text-indigo-600 mb-2" size={32} /></div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-sm">
          <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock size={16}/> Últimas Ações</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-zinc-50/30">
             {eventosLog.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                 <Activity size={32} className="opacity-20" /><p className="text-xs font-medium">Aguardando movimento...</p>
               </div>
             ) : (
               eventosLog.map(log => (
                 <div key={log.id} className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-sm animate-in slide-in-from-left-4 fade-in">
                   <div className="flex items-center gap-2 mb-1.5">
                     <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getCorPorTipo(log.tipo) }}></span>
                     <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">{log.tempo}</span>
                   </div>
                   <p className="text-sm text-zinc-800 font-medium leading-snug">{log.msg}</p>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
            <h2 className="text-lg font-black flex items-center gap-2 text-zinc-900"><Bike size={20} className="text-indigo-600"/> Tempo de Entrega (Hoje)</h2>
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-0.5">Média Geral</span>
              <span className="bg-indigo-50 text-indigo-700 text-sm font-black px-3 py-1 rounded-lg border border-indigo-100">{tempoMedioGeral} min</span>
            </div>
          </div>
          <div className="flex-1">
            {metricasEntregadores.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-6 border-2 border-dashed border-zinc-100 rounded-xl">
                 <Clock size={32} className="opacity-30 mb-2" /><p className="text-sm font-medium">Nenhum pedido entregue ainda hoje.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metricasEntregadores.map((moto, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 bg-zinc-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center font-black text-sm">{moto.nome.charAt(0)}</div>
                      <div><p className="font-bold text-sm text-zinc-900">{moto.nome}</p><p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">{moto.entregas} entregas</p></div>
                    </div>
                    <div className="text-right"><span className={`text-sm font-black px-2.5 py-1 rounded-md ${moto.tempoMedio <= 30 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{moto.tempoMedio} min</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-[#1877F2]/10 pb-4"><h2 className="text-lg font-black flex items-center gap-2 text-[#1877F2]"><Facebook size={20}/> Meta Ads</h2></div>
          <div className="mb-6"><p className="text-[10px] font-black text-[#1877F2]/70 uppercase flex items-center gap-1.5 mb-1"><Megaphone size={14}/> Gasto em Anúncios</p><p className="text-3xl font-black text-[#1877F2]">R$ {gastoAdsHoje.toFixed(2).replace('.', ',')}</p></div>
          <div className="flex-1">
            <p className="text-xs font-bold text-zinc-600 mb-3 uppercase tracking-wider">Campanhas</p>
            {campanhasAtivas.length === 0 ? (<p className="text-xs text-zinc-500 italic">Nenhum anúncio ativo.</p>) : (
              <div className="space-y-3">
                {campanhasAtivas.map((camp, idx) => (
                  <div key={idx} className="bg-white border border-[#1877F2]/20 p-3 rounded-xl flex justify-between items-center">
                    <div className="min-w-0 flex-1 pr-3"><p className="font-bold text-xs text-zinc-800 truncate">{camp.nome}</p><p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1"><MousePointerClick size={10}/> {camp.cliques} cliques</p></div>
                    <div className="text-right shrink-0"><p className="text-xs font-black text-[#1877F2]">R$ {camp.gasto.toFixed(2).replace('.', ',')}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}