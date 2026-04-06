// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Activity, Eye, ShoppingCart, CreditCard, DollarSign, Clock } from "lucide-react";
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
  
  const centroPadrao = [-17.7289, -46.1661]; 
  const [mapCenter, setMapCenter] = useState<[number, number]>(centroPadrao);

  useEffect(() => {
    if (!tenant) return;

    const canal = supabase.channel(`radar_${tenant.id}`);

    canal
      .on('broadcast', { event: 'cliente_acao' }, (payload) => {
        const dado = payload.payload;
        
        // 1. Atualiza a posição e mantém o visitante "vivo" no mapa
        if (dado.lat && dado.lng && dado.id) {
           setVisitantesAtivos(prev => ({
             ...prev,
             [dado.id]: { lat: dado.lat, lng: dado.lng, ultimaAcao: Date.now(), tipo: dado.tipo === 'ping' ? 'view' : dado.tipo }
           }));
        }

        // 2. Se for só um "pulso" (ping), a gente para por aqui para não poluir o painel
        if (dado.tipo === 'ping') return; 

        // 3. Atualiza o Feed Lateral com trava de segurança para o Localhost
        setEventosLog(prev => {
          if (prev.length > 0 && prev[0].msg === dado.mensagem && prev[0].tipo === dado.tipo) return prev;
          const newLog = [{ id: Math.random().toString(36).substr(2, 9), msg: dado.mensagem, tipo: dado.tipo, tempo: 'Agora' }, ...prev];
          return newLog.slice(0, 15); 
        });

        // 4. Atualiza Métricas Dinâmicas
        if (dado.tipo === 'cart') {
          setMetricas(m => ({ ...m, carrinhos: m.carrinhos + 1 }));
        } else if (dado.tipo === 'checkout') {
          setMetricas(m => ({ ...m, checkouts: m.checkouts + 1 }));
        } else if (dado.tipo === 'purchase') {
          setMetricas(m => ({ 
            ...m, 
            vendasHoje: m.vendasHoje + 1, 
            receitaHoje: m.receitaHoje + (Number(dado.valor) || 0) 
          }));
          tocarSomCash();
        }
      })
      .subscribe();

    // Limpeza de Visitantes Ociosos (Saiu do site e parou de mandar ping por 1 minuto)
    const interval = setInterval(() => {
       const agora = Date.now();
       setVisitantesAtivos(prev => {
         const novoEstado = { ...prev };
         let mudou = false;
         Object.keys(novoEstado).forEach(id => {
           if (agora - novoEstado[id].ultimaAcao > 60000) { 
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

  // Sincroniza o número de visitantes online com a quantidade de bolinhas no mapa
  useEffect(() => {
     setMetricas(m => ({ ...m, visitantes: Object.keys(visitantesAtivos).length }));
  }, [visitantesAtivos]);

  const tocarSomCash = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Som bloqueado", e));
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
           <p className="text-zinc-500 mt-1 text-sm">Acompanhe o funil de vendas e a localização dos clientes em tempo real.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
           <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Eye size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Visitantes Agora</p><p className="text-3xl font-black text-zinc-900">{metricas.visitantes}</p></div>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
           <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><ShoppingCart size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">No Carrinho</p><p className="text-3xl font-black text-zinc-900">{metricas.carrinhos}</p></div>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
           <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><CreditCard size={24}/></div>
           <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">No Checkout</p><p className="text-3xl font-black text-zinc-900">{metricas.checkouts}</p></div>
        </div>
        <div className="bg-emerald-600 border border-emerald-700 p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden shadow-md">
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-transparent pointer-events-none"></div>
           <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 z-10"><DollarSign size={24}/></div>
           <div className="z-10"><p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Receita (Hoje)</p><p className="text-3xl font-black text-white">R$ {metricas.receitaHoje.toFixed(2).replace('.', ',')}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden h-[500px] relative shadow-sm">
          <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur border border-zinc-200 px-4 py-2 rounded-xl shadow-sm">
             <p className="text-xs font-bold flex items-center gap-2 text-zinc-700">
               <Activity size={14} className="text-indigo-600"/> Mapeamento Vivo
             </p>
          </div>
          
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; CartoDB'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
            />
            {Object.values(visitantesAtivos).map((cliente, i) => (
              <CircleMarker
                key={i}
                center={[cliente.lat, cliente.lng]}
                radius={8}
                pathOptions={{ fillColor: getCorPorTipo(cliente.tipo), color: '#ffffff', weight: 2, fillOpacity: 0.8 }}
              >
                 <div className="animate-ping absolute inset-0 rounded-full bg-inherit opacity-75"></div>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-sm">
          <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock size={16}/> Últimas Ações</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-zinc-50/30">
             {eventosLog.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                 <Activity size={32} className="opacity-20" />
                 <p className="text-xs font-medium">Aguardando movimento...</p>
               </div>
             ) : (
               eventosLog.map(log => (
                 <div key={log.id} className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-sm animate-in slide-in-from-left-4 fade-in hover:border-indigo-200 transition-colors">
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
    </div>
  );
}