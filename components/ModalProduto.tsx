"use client";

import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { supabase } from "../lib/supabase";
import { X, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";

export default function ModalProduto({ produto, tenantId, onClose }: { produto: any, tenantId: string, onClose: () => void }) {
  const cart = useCart();
  // MOTOR À PROVA DE FALHAS: Procura a função independente do nome que estiver no seu contexto
  const adicionarProduto = cart.adicionarAoCarrinho || cart.adicionarItem || cart.addItem || cart.add;

  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<any[]>([]);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<any[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(true);

  useEffect(() => {
    async function buscarAdicionais() {
      const { data } = await supabase.from("addons").select("*").eq("tenant_id", tenantId).eq("active", true);
      if (data) {
        const vinculados = data.filter(addon => addon.linked_products && addon.linked_products.includes(produto.id));
        setAdicionaisDisponiveis(vinculados);
      }
      setLoadingAddons(false);
    }
    buscarAdicionais();
  }, [produto.id, tenantId]);

  const toggleAdicional = (addon: any) => {
    const jaSelecionado = adicionaisSelecionados.find(a => a.id === addon.id);
    if (jaSelecionado) setAdicionaisSelecionados(adicionaisSelecionados.filter(a => a.id !== addon.id));
    else setAdicionaisSelecionados([...adicionaisSelecionados, addon]);
  };

  const valorAdicionais = adicionaisSelecionados.reduce((acc, curr) => acc + Number(curr.price), 0);
  const valorTotalProduto = (Number(produto.price) + valorAdicionais) * quantidade;

  const handleAdicionarAoCarrinho = () => {
    if (adicionarProduto) {
      adicionarProduto(produto, quantidade, adicionaisSelecionados, observacao);
      onClose();
    } else {
      alert("Erro na integração do carrinho. Verifique o CartContext.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-zinc-900/80 sm:p-4 animate-in fade-in font-sans">
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 max-h-[90vh] flex flex-col">
        
        <div className="relative shrink-0">
          {produto.image_url ? (
            <div className="w-full h-48 bg-zinc-100 relative"><img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" /></div>
          ) : (<div className="pt-6"></div>)}
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full text-zinc-900 hover:bg-white shadow-sm transition-colors z-10"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <h2 className="text-2xl font-bold text-zinc-900">{produto.name}</h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{produto.description}</p>
          <p className="text-xl font-black text-red-600 mt-4">R$ {Number(produto.price).toFixed(2).replace('.', ',')}</p>

          <div className="mt-8 pt-6 border-t border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-1">Turbine seu pedido</h3>
            <p className="text-xs text-zinc-500 mb-4">Escolha os complementos desejados (Opcional)</p>
            {loadingAddons ? (
              <div className="flex items-center justify-center py-4 text-zinc-400 gap-2"><Loader2 size={16} className="animate-spin"/> Carregando opções...</div>
            ) : adicionaisDisponiveis.length === 0 ? (
              <p className="text-sm text-zinc-400 bg-zinc-50 p-3 rounded-lg border border-zinc-100">Nenhum complemento disponível.</p>
            ) : (
              <div className="space-y-2">
                {adicionaisDisponiveis.map(addon => (
                  <label key={addon.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!adicionaisSelecionados.find(a => a.id === addon.id)} onChange={() => toggleAdicional(addon)} className="w-5 h-5 accent-red-600 rounded border-zinc-300" />
                      <span className="font-medium text-zinc-800 text-sm">{addon.name}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-600">+ R$ {Number(addon.price).toFixed(2).replace('.', ',')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-2">Alguma observação?</h3>
            <textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Tirar cebola..." className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600 outline-none resize-none" />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center gap-4 shrink-0">
          <div className="flex items-center bg-white border border-zinc-300 rounded-xl shadow-sm">
            <button onClick={() => setQuantidade(Math.max(1, quantidade - 1))} className="p-3 text-zinc-500 hover:text-zinc-900"><Minus size={18} /></button>
            <span className="w-8 text-center font-bold text-zinc-900">{quantidade}</span>
            <button onClick={() => setQuantidade(quantidade + 1)} className="p-3 text-zinc-500 hover:text-zinc-900"><Plus size={18} /></button>
          </div>
          <button onClick={handleAdicionarAoCarrinho} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors flex justify-between items-center">
            <span className="flex items-center gap-2"><ShoppingBag size={18}/> Adicionar</span>
            <span>R$ {valorTotalProduto.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}