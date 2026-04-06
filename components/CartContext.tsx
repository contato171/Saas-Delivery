"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { MapPin } from "lucide-react"; 

const CartContext = createContext<any>(null);

export function CartProvider({ children, tenantId }: { children: ReactNode, tenantId: string }) {
  const [itens, setItens] = useState<any[]>([]);
  const [cupomAtivo, setCupomAtivo] = useState<{codigo: string, desconto: number} | null>(null);

  const channelRef = useRef<any>(null);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [enderecoDetectado, setEnderecoDetectado] = useState<any>(null);

  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('@saas_session');
      if (!id) { id = Math.random().toString(36).substring(2, 15); sessionStorage.setItem('@saas_session', id); }
      return id;
    }
    return "sessao_vazia";
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const jaPerguntou = sessionStorage.getItem('@saas_gps_asked');
    if (!jaPerguntou && navigator.geolocation) {
      const timer = setTimeout(() => setShowGpsPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!tenantId || typeof window === 'undefined') return;

    const setupRadar = async () => {
      let loc = JSON.parse(sessionStorage.getItem('@saas_loc') || 'null');
      
      if (!loc) {
        try {
          const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
          const data = await res.json();
          if (data.latitude) loc = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
        } catch (e) {
          loc = { lat: -17.7 + (Math.random() * 0.05), lng: -46.1 + (Math.random() * 0.05) };
        }
      }

      const canal = supabase.channel(`radar_${tenantId}`);
      canal.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Pequeno delay para garantir que o WebSocket conectou 100%
          setTimeout(() => {
            canal.send({
              type: 'broadcast',
              event: 'cliente_acao',
              payload: { id: sessionId, lat: loc?.lat, lng: loc?.lng, tipo: 'view', mensagem: '👀 Novo visitante entrou no cardápio', valor: 0 }
            });
          }, 1000);
        }
      });
      channelRef.current = { canal, loc };
    };

    setupRadar();

    // BATIMENTO CARDÍACO (HEARTBEAT): Avisa a cada 20 segundos que o cliente ainda está no site
    const heartBeat = setInterval(() => {
      if (channelRef.current?.canal && channelRef.current?.loc) {
        channelRef.current.canal.send({
          type: 'broadcast',
          event: 'cliente_acao',
          payload: { id: sessionId, lat: channelRef.current.loc.lat, lng: channelRef.current.loc.lng, tipo: 'ping', mensagem: 'ping', valor: 0 }
        });
      }
    }, 20000);

    return () => {
      if (channelRef.current?.canal) supabase.removeChannel(channelRef.current.canal);
      clearInterval(heartBeat);
    };
  }, [tenantId]);

  const dispararEventoRadar = (tipo: string, msg: string, valor: number = 0) => {
    if (channelRef.current?.canal && channelRef.current?.loc) {
      channelRef.current.canal.send({
        type: 'broadcast',
        event: 'cliente_acao',
        payload: { id: sessionId, lat: channelRef.current.loc.lat, lng: channelRef.current.loc.lng, tipo, mensagem: msg, valor }
      });
    }
  };

  const aceitarGps = () => {
    sessionStorage.setItem('@saas_gps_asked', 'true');
    setShowGpsPrompt(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        sessionStorage.setItem('@saas_loc', JSON.stringify(loc));
        
        if (channelRef.current) {
           channelRef.current.loc = loc;
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`);
          const data = await res.json();
          
          if (data && data.address) {
            const rua = data.address.road || "";
            const bairro = data.address.suburb || data.address.neighbourhood || "";
            const cidade = data.address.city || data.address.town || data.address.village || "";
            const uf = data.address.state || "";

            setEnderecoDetectado({
              rua: rua,
              bairro: bairro,
              cidade: cidade,
              uf: uf,
              cep: data.address.postcode?.replace(/\D/g, '') || ""
            });

            let mensagemRadar = '📍 GPS Localizado com Sucesso';
            if (bairro && rua) {
              mensagemRadar = `📍 Acessando de: ${bairro} (${rua})`;
            } else if (bairro || cidade) {
              mensagemRadar = `📍 Acessando de: ${bairro || cidade}`;
            }

            dispararEventoRadar('view', mensagemRadar);
          } else {
             dispararEventoRadar('view', '📍 GPS Localizado com Sucesso');
          }
        } catch(e) { 
          dispararEventoRadar('view', '📍 GPS Localizado com Sucesso');
        }
      },
      () => {
        dispararEventoRadar('view', '🚫 Cliente não autorizou o GPS (Usando IP)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const recusarGps = () => {
    sessionStorage.setItem('@saas_gps_asked', 'true');
    setShowGpsPrompt(false);
    dispararEventoRadar('view', '🚫 Cliente fechou o aviso de GPS (Usando IP)');
  };

  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem("@saas_cart");
    if (carrinhoSalvo) {
      try { setItens(JSON.parse(carrinhoSalvo)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("@saas_cart", JSON.stringify(itens));
  }, [itens]);

  const adicionarItem = (produto: any, quantidade: number, adicionais: any[] = [], observacao: string = "", variacao: string | null = null) => {
    const valorAdicionais = adicionais.reduce((acc, add) => acc + Number(add.price), 0);
    const precoUnitario = Number(produto.price) + valorAdicionais;
    const precoTotal = precoUnitario * quantidade;

    const novoItem = { id: Math.random().toString(36).substr(2, 9), produto, quantidade, adicionais, observacao, variacao, precoTotal };
    setItens([...itens, novoItem]);

    dispararEventoRadar('cart', `Adicionou ${quantidade}x ${produto.name}`);
  };

  const removerItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
    if (itens.length <= 1) setCupomAtivo(null);
  };

  const subtotal = itens.reduce((acc, item) => acc + (item.precoTotal || 0), 0);
  const valorDesconto = cupomAtivo ? subtotal * (cupomAtivo.desconto / 100) : 0;
  const totalCarrinho = subtotal - valorDesconto;

  return (
    <CartContext.Provider value={{ 
      itens, adicionarItem, removerItem, 
      subtotal, totalCarrinho, 
      cupomAtivo, setCupomAtivo, valorDesconto,
      dispararEventoRadar, 
      enderecoDetectado 
    }}>
      {children}

      {showGpsPrompt && (
        <div className="fixed inset-0 z-[9999] bg-zinc-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5 mx-auto">
                <MapPin size={28} className="animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 mb-2 text-center">Área de Entrega</h2>
              <p className="text-zinc-500 text-sm mb-6 text-center leading-relaxed">
                Para verificar se entregamos no seu endereço e preencher os dados automaticamente, precisamos da sua localização.
              </p>
              <div className="space-y-3">
                 <button onClick={aceitarGps} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95">
                   Permitir Localização
                 </button>
                 <button onClick={recusarGps} className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-4 rounded-xl transition-all">
                   Informar depois no Checkout
                 </button>
              </div>
           </div>
        </div>
      )}

    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);