"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useCart } from "./CartContext";
import { X, Ticket, HelpCircle, Loader2 } from "lucide-react";

export default function CarrinhoLateral({ tenant, onClose, onCheckout }: { tenant: any, onClose: () => void, onCheckout: () => void }) {
  // Puxa tudo do cérebro global
  const { itens, subtotal, totalCarrinho, removerItem, cupomAtivo, setCupomAtivo, valorDesconto } = useCart();
  
  const [cupomInput, setCupomInput] = useState("");
  const [msgCupom, setMsgCupom] = useState("");
  const [verificandoCupom, setVerificandoCupom] = useState(false);

  const taxaEntrega = tenant?.base_delivery_fee || 0; 
  const totalGeral = totalCarrinho + taxaEntrega;

  const aplicarCupom = async () => {
    if (!cupomInput) return;
    setVerificandoCupom(true);
    setMsgCupom("");
    
    try {
      const { data } = await supabase.from("coupons").select("*").eq("tenant_id", tenant.id).eq("code", cupomInput.toUpperCase()).eq("is_active", true).single();
      if (data) {
        setCupomAtivo({ codigo: data.code, desconto: data.discount_percent });
        setMsgCupom("Cupom aplicado com sucesso!");
        setCupomInput("");
      } else {
        setMsgCupom("Cupom inválido ou expirado.");
      }
    } catch (e) {
      setMsgCupom("Erro ao verificar cupom.");
    } finally {
      setVerificandoCupom(false);
    }
  };

  const removerCupom = () => {
    setCupomAtivo(null);
    setMsgCupom("");
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-zinc-900/60 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full">
        
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900">Seu pedido em</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-800 bg-zinc-50 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-zinc-50">
          <div>
            <h3 className="font-bold text-zinc-900 text-lg leading-tight">{tenant?.name}</h3>
            <p className="text-xs font-medium text-zinc-500 mt-1">O Melhor Sabor da Cidade</p>
          </div>
          <button onClick={onClose} className="text-red-600 font-bold text-sm hover:underline">Ver Cardápio</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 custom-scrollbar">
          {itens.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">Sua sacola está vazia.</div>
          ) : (
            itens.map((item: any) => (
              <div key={item.id} className="border-b border-zinc-100 pb-4 last:border-0">
                <div className="flex justify-between items-start gap-4">
                  <p className="font-medium text-sm text-zinc-900 flex-1 leading-snug">
                    <span className="font-black text-red-600">{item.quantidade}x</span> {item?.produto?.name}
                  </p>
                  <p className="font-medium text-sm text-zinc-900 whitespace-nowrap">R$ {(item.precoTotal || 0).toFixed(2).replace('.', ',')}</p>
                </div>
                
                {item.adicionais && item.adicionais.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    + {item.adicionais.map((add: any) => add.name).join(", ")}
                  </p>
                )}

                <div className="flex gap-4 mt-3">
                  <button onClick={() => removerItem(item.id)} className="text-zinc-400 font-bold text-xs hover:text-red-600 transition-colors">Remover Item</button>
                </div>
              </div>
            ))
          )}

          {/* ÁREA DE CUPOM REAL */}
          {itens.length > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-100">
              {cupomAtivo ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Ticket size={18}/>
                    <span className="font-bold text-sm">{cupomAtivo.codigo} ({cupomAtivo.desconto}% OFF)</span>
                  </div>
                  <button onClick={removerCupom} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline">Remover</button>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2"><Ticket size={16} className="text-zinc-400"/> Tem um cupom?</h3>
                  <div className="flex gap-2">
                    <input type="text" value={cupomInput} onChange={e => setCupomInput(e.target.value)} placeholder="Código do cupom" className="flex-1 border border-zinc-300 rounded-lg p-2.5 text-sm uppercase font-bold focus:ring-2 focus:ring-red-600 outline-none" />
                    <button onClick={aplicarCupom} disabled={verificandoCupom} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 rounded-lg text-sm transition-colors flex items-center justify-center min-w-[80px]">
                      {verificandoCupom ? <Loader2 size={16} className="animate-spin"/> : "Aplicar"}
                    </button>
                  </div>
                  {msgCupom && <p className={`text-xs font-bold mt-2 ${msgCupom.includes("sucesso") ? 'text-emerald-600' : 'text-red-500'}`}>{msgCupom}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div className="p-6 bg-white border-t border-zinc-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] shrink-0">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-zinc-600"><span>Subtotal dos itens</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              {cupomAtivo && <div className="flex justify-between text-sm font-bold text-emerald-600"><span>Desconto ({cupomAtivo.desconto}%)</span><span>- R$ {valorDesconto.toFixed(2).replace('.', ',')}</span></div>}
              <div className="flex justify-between text-sm text-zinc-600"><span>Taxa de entrega (Padrão)</span><span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span></div>
              <div className="flex justify-between font-black text-lg text-zinc-900 pt-3 border-t border-zinc-100">
                <span>Total Estimado</span><span className="text-red-600">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            
            <button onClick={onCheckout} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-md text-[15px] transition-colors active:scale-95">
              Confirmar e Ir para Pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}