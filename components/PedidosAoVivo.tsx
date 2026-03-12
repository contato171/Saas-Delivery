"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { 
  KanbanSquare, History, CheckCircle2, XCircle, Trash2, 
  ChefHat, Bike, Clock, MapPin, CreditCard, RefreshCw, AlertTriangle,
  VolumeX, BellRing
} from "lucide-react";

export default function PedidosAoVivo({ tenantId }: { tenantId: string }) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"kanban" | "historico">("kanban");
  const [atualizando, setAtualizando] = useState(false);

  // Estados do Motor de Alarme
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [somBloqueado, setSomBloqueado] = useState(false);

  // Inicializa o Áudio do Alarme (SOM DE TELEFONE - GESTOR IFOOD)
  useEffect(() => {
    // Este é o som de "Trim-trim" clássico do painel de restaurantes
    audioRef.current = new Audio("/toque.mp3");
    
    // Deixamos em loop verdadeiro. Ele vai tocar sem parar até o pedido ser aceito.
    if (audioRef.current) {
      audioRef.current.loop = true;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const carregarPedidos = async () => {
    setAtualizando(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (data) setPedidos(data);
    setLoading(false);
    setAtualizando(false);
  };

  useEffect(() => {
    carregarPedidos();
    const intervalo = setInterval(carregarPedidos, 10000);
    return () => clearInterval(intervalo);
  }, [tenantId]);

  const pendentes = pedidos.filter(p => p.status === "pendente");
  const preparando = pedidos.filter(p => p.status === "preparando");
  const prontos = pedidos.filter(p => p.status === "pronto");
  const historico = pedidos.filter(p => ["concluido", "cancelado", "excluido"].includes(p.status));

  // MOTOR DO ALARME
  useEffect(() => {
    if (!audioRef.current) return;

    if (pendentes.length > 0) {
      audioRef.current.play().catch(() => {
        setSomBloqueado(true); // Se o navegador bloquear o autoplay
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSomBloqueado(false);
    }
  }, [pendentes.length]);

  const habilitarSomManual = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setSomBloqueado(false);
        if (pendentes.length === 0) {
          audioRef.current?.pause();
        }
      }).catch(err => console.error("Ainda bloqueado", err));
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    setPedidos(pedidos.map(p => p.id === id ? { ...p, status: novoStatus } : p));
    await supabase.from("orders").update({ status: novoStatus }).eq("id", id);
  };

  const acaoRecusar = async (pedido: any) => {
    const confirmar = window.confirm(`Tem a certeza que deseja RECUSAR o pedido de ${pedido.customer_name}?`);
    if (confirmar) {
      await alterarStatus(pedido.id, "cancelado");
      const wpp = pedido.customer_phone?.replace(/\D/g, '');
      if (wpp) {
        const texto = `Olá ${pedido.customer_name}. Pedimos desculpas, mas tivemos que cancelar o seu pedido #${pedido.id.split('-')[0].toUpperCase()}.`;
        window.open(`https://wa.me/55${wpp}?text=${encodeURIComponent(texto)}`, "_blank");
      }
    }
  };

  const acaoExcluir = async (id: string) => {
    if (window.confirm("EXCLUIR PEDIDO? Use isto apenas para trotes.")) {
      await alterarStatus(id, "excluido");
    }
  };

  const formatarHora = (dataString: string) => {
    return new Date(dataString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const CardPedido = ({ pedido, coluna }: { pedido: any, coluna: string }) => (
    <div className={`bg-white border ${coluna === 'pendente' ? 'border-blue-200 shadow-blue-100/50' : 'border-zinc-200'} rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left animate-in fade-in flex flex-col h-full relative overflow-hidden`}>
      
      {coluna === 'pendente' && <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>}

      <div className="flex justify-between items-start border-b border-zinc-100 pb-3 mb-3">
        <div>
          <span className="bg-zinc-100 text-zinc-600 font-bold px-2 py-1 rounded text-xs">#{pedido.id.split('-')[0].toUpperCase()}</span>
          <h3 className="font-bold text-zinc-900 mt-1">{pedido.customer_name}</h3>
          <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1"><Clock size={12}/> {formatarHora(pedido.created_at)}</p>
        </div>
        <p className="font-black text-blue-600">R$ {Number(pedido.total_amount).toFixed(2).replace(".", ",")}</p>
      </div>

      <div className="flex-1 space-y-3">
        <div className="bg-zinc-50/80 rounded-lg p-3 border border-zinc-100">
          <ul className="text-sm space-y-3">
            {pedido.order_items?.map((item: any, i: number) => (
              <li key={i} className="flex flex-col">
                <span className="font-medium text-zinc-800">
                  <span className="font-black text-zinc-900 mr-1">{item.quantity}x</span> {item.product_name}
                </span>
                
                {item.options_text && (
                  <p className="text-xs font-medium text-zinc-500 mt-1 whitespace-pre-line pl-3 border-l-2 border-zinc-200 leading-relaxed">
                    {item.options_text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-xs text-zinc-600 space-y-1.5 pt-1">
          <p className="flex items-start gap-1.5 leading-tight"><MapPin size={14} className="mt-0.5 text-zinc-400 shrink-0"/> {pedido.customer_address}</p>
          <p className="flex items-center gap-1.5"><CreditCard size={14} className="text-zinc-400 shrink-0"/> {pedido.payment_method}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2 shrink-0">
        {coluna === "pendente" && (
          <>
            <button onClick={() => alterarStatus(pedido.id, "preparando")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-sm">
              <CheckCircle2 size={18}/> Aceitar & Preparar
            </button>
            <div className="flex gap-2">
              <button onClick={() => acaoRecusar(pedido)} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-bold py-2 rounded-lg text-xs flex justify-center items-center gap-1 transition-colors">
                <XCircle size={14}/> Recusar
              </button>
              <button onClick={() => acaoExcluir(pedido.id)} className="flex-1 border border-zinc-200 text-zinc-500 hover:bg-zinc-100 font-bold py-2 rounded-lg text-xs flex justify-center items-center gap-1 transition-colors">
                <Trash2 size={14}/> Excluir
              </button>
            </div>
          </>
        )}

        {coluna === "preparando" && (
          <button onClick={() => alterarStatus(pedido.id, "pronto")} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-sm">
            <ChefHat size={18}/> Marcar como Pronto
          </button>
        )}

        {coluna === "pronto" && (
          <button onClick={() => alterarStatus(pedido.id, "concluido")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-sm">
            <Bike size={18}/> Despachar (Concluir)
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-zinc-900 font-sans h-full flex flex-col pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cozinha / Despache</h1>
          <p className="text-zinc-500 mt-1 text-sm">Gerencie o fluxo de pedidos ao vivo.</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={carregarPedidos} className="flex items-center gap-2 text-sm font-bold bg-white border border-zinc-200 px-4 py-2.5 rounded-lg shadow-sm hover:bg-zinc-50 transition-colors text-zinc-700">
            <RefreshCw size={16} className={atualizando ? "animate-spin text-blue-600" : "text-zinc-400"} /> 
            {atualizando ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {somBloqueado && pendentes.length > 0 && (
        <button onClick={habilitarSomManual} className="w-full bg-red-600 text-white font-bold p-3 rounded-xl shadow-md flex items-center justify-center gap-3 animate-pulse cursor-pointer hover:bg-red-700 transition-colors">
          <VolumeX size={24} />
          <span>O navegador bloqueou o som! Clique aqui para Ativar a Campainha da Cozinha.</span>
        </button>
      )}

      <div className="flex gap-6 border-b border-zinc-200">
        <button onClick={() => setAbaAtiva("kanban")} className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${abaAtiva === "kanban" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <KanbanSquare size={18} /> Linha de Produção Ao Vivo
        </button>
        <button onClick={() => setAbaAtiva("historico")} className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${abaAtiva === "historico" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <History size={18} /> Histórico & Cancelados
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium"><RefreshCw size={24} className="animate-spin mr-2"/> Carregando motor da cozinha...</div>
      ) : abaAtiva === "kanban" ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden items-start">
          
          <div className="bg-zinc-100/50 rounded-2xl border border-zinc-200 p-4 flex flex-col h-full max-h-[75vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                {pendentes.length > 0 ? <BellRing size={18} className="text-red-500 animate-bounce"/> : <AlertTriangle size={18} className="text-zinc-400"/>}
                Novos Pedidos
              </h2>
              <span className={`font-black text-xs px-2.5 py-1 rounded-full ${pendentes.length > 0 ? 'bg-red-100 text-red-700' : 'bg-zinc-200 text-zinc-600'}`}>{pendentes.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {pendentes.length === 0 ? <p className="text-sm text-zinc-400 text-center py-10 font-medium border-2 border-dashed border-zinc-200 rounded-xl mx-2">Nenhum pedido na fila.</p> : pendentes.map(p => <CardPedido key={p.id} pedido={p} coluna="pendente" />)}
            </div>
          </div>

          <div className="bg-zinc-100/50 rounded-2xl border border-zinc-200 p-4 flex flex-col h-full max-h-[75vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2"><ChefHat size={18} className="text-orange-500"/> Preparando</h2>
              <span className="bg-orange-100 text-orange-700 font-black text-xs px-2.5 py-1 rounded-full">{preparando.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {preparando.length === 0 ? <p className="text-sm text-zinc-400 text-center py-10 font-medium border-2 border-dashed border-zinc-200 rounded-xl mx-2">Cozinha livre.</p> : preparando.map(p => <CardPedido key={p.id} pedido={p} coluna="preparando" />)}
            </div>
          </div>

          <div className="bg-zinc-100/50 rounded-2xl border border-zinc-200 p-4 flex flex-col h-full max-h-[75vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2"><Bike size={18} className="text-emerald-500"/> Prontos p/ Despache</h2>
              <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2.5 py-1 rounded-full">{prontos.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {prontos.length === 0 ? <p className="text-sm text-zinc-400 text-center py-10 font-medium border-2 border-dashed border-zinc-200 rounded-xl mx-2">Aguardando pacotes.</p> : prontos.map(p => <CardPedido key={p.id} pedido={p} coluna="pronto" />)}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <th className="p-4 font-semibold">ID / Hora</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Valor</th>
                  <th className="p-4 font-semibold">Status Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {historico.length === 0 ? (
                   <tr><td colSpan={4} className="p-8 text-center text-zinc-500">Nenhum histórico encontrado.</td></tr>
                ) : (
                  historico.map(pedido => (
                    <tr key={pedido.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-zinc-900">#{pedido.id.split('-')[0].toUpperCase()}</span>
                        <p className="text-xs text-zinc-500 mt-0.5">{new Date(pedido.created_at).toLocaleString('pt-BR')}</p>
                      </td>
                      <td className="p-4 font-medium text-zinc-800">{pedido.customer_name}</td>
                      <td className="p-4 font-bold text-zinc-900">R$ {Number(pedido.total_amount).toFixed(2).replace(".", ",")}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          pedido.status === "concluido" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          pedido.status === "cancelado" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-zinc-100 text-zinc-500 border-zinc-200"
                        }`}>
                          {pedido.status === "concluido" ? "Entregue" : pedido.status === "cancelado" ? "Recusado" : "Excluído"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}