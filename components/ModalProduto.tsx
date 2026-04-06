// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { supabase } from "../lib/supabase";
import { X, Plus, Minus, ShoppingBag, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ModalProduto({ produto, tenantId, isAberta, onClose }: { produto: any, tenantId: string, isAberta: boolean, onClose: () => void }) {
  const cart = useCart();
  const adicionarProduto = cart.adicionarAoCarrinho || cart.adicionarItem || cart.addItem || cart.add;

  const [quantidadeGlobal, setQuantidadeGlobal] = useState(1);
  const [observacao, setObservacao] = useState("");
  
  const [gruposComplementos, setGruposComplementos] = useState<any[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(true);

  const [selecoes, setSelecionados] = useState<Record<string, number>>({});
  
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<string | null>(null);

  useEffect(() => {
    async function buscarGrupos() {
      const { data } = await supabase
        .from("complement_groups")
        .select("*, complement_items(*)")
        .eq("product_id", produto.id);
      
      if (data) setGruposComplementos(data);
      setLoadingGrupos(false);
    }
    buscarGrupos();
  }, [produto.id]);

  useEffect(() => {
    // @ts-ignore
    if (typeof window !== "undefined" && window.fbq) {
      // @ts-ignore
      window.fbq('track', 'ViewContent', {
        content_name: produto.name,
        content_ids: [produto.id],
        content_type: 'product',
        value: Number(produto.price),
        currency: 'BRL'
      });
    }
  }, [produto]);

  const alterarSelecao = (grupo: any, item: any, operacao: 'add' | 'remove') => {
    const atualDoItem = selecoes[item.id] || 0;
    
    const totalSelecionadoNoGrupo = grupo.complement_items.reduce((acc: number, curr: any) => {
      return acc + (selecoes[curr.id] || 0);
    }, 0);

    if (operacao === 'add') {
      if (totalSelecionadoNoGrupo >= grupo.max_items) return; 
      setSelecionados(prev => ({ ...prev, [item.id]: atualDoItem + 1 }));
    } else {
      if (atualDoItem <= 0) return; 
      setSelecionados(prev => {
        const novo = { ...prev };
        novo[item.id] = atualDoItem - 1;
        if (novo[item.id] === 0) delete novo[item.id];
        return novo;
      });
    }
  };

  const isComplementosOk = gruposComplementos.every(grupo => {
    if (!grupo.is_required) return true;
    const totalNoGrupo = grupo.complement_items.reduce((acc: number, curr: any) => acc + (selecoes[curr.id] || 0), 0);
    return totalNoGrupo >= grupo.min_items;
  });

  const temVariacoes = produto.variations && produto.variations.length > 0;
  const isVariacaoOk = temVariacoes ? variacaoSelecionada !== null : true;
  
  const isPodeAdicionar = isComplementosOk && isVariacaoOk && isAberta;

  let valorExtraUnitario = 0;
  const listaFormatadaParaCarrinho: any[] = [];

  gruposComplementos.forEach(grupo => {
    let precosDesteGrupo: number[] = [];
    let nomesDesteGrupo: string[] = [];

    grupo.complement_items.forEach((item: any) => {
      const qtd = selecoes[item.id];
      if (qtd && qtd > 0) {
        for (let i = 0; i < qtd; i++) precosDesteGrupo.push(Number(item.price));
        
        let nomeNoCarrinho = qtd > 1 ? `${qtd}x ${item.name}` : item.name;
        nomesDesteGrupo.push(nomeNoCarrinho);
      }
    });

    if (precosDesteGrupo.length > 0) {
      let valorDoGrupo = 0;

      if (grupo.tipo_calculo === 'maior') {
        valorDoGrupo = Math.max(...precosDesteGrupo);
      } else if (grupo.tipo_calculo === 'media') {
        const somaTudo = precosDesteGrupo.reduce((a, b) => a + b, 0);
        valorDoGrupo = somaTudo / precosDesteGrupo.length;
      } else {
        valorDoGrupo = precosDesteGrupo.reduce((a, b) => a + b, 0);
      }

      valorExtraUnitario += valorDoGrupo;

      let textoCart = nomesDesteGrupo.join(" e ");
      if (grupo.tipo_calculo === 'maior' && precosDesteGrupo.length > 1) {
        textoCart += " (Maior Valor)";
      }

      listaFormatadaParaCarrinho.push({
        id: grupo.id,
        name: textoCart,
        price: valorDoGrupo
      });
    }
  });

  const valorFinalTela = (Number(produto.price) + valorExtraUnitario) * quantidadeGlobal;

  const handleAdicionarAoCarrinho = () => {
    if (!isAberta) return alert("A loja está fechada no momento.");
    if (!isPodeAdicionar) return alert("Por favor, preencha as opções obrigatórias.");
    
    // @ts-ignore
    if (typeof window !== "undefined" && window.fbq) {
      // @ts-ignore
      window.fbq('track', 'AddToCart', {
        content_name: produto.name,
        content_ids: [produto.id],
        content_type: 'product',
        value: valorFinalTela,
        currency: 'BRL'
      });
    }

    if (adicionarProduto) {
      adicionarProduto(produto, quantidadeGlobal, listaFormatadaParaCarrinho, observacao, variacaoSelecionada);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-zinc-900/80 sm:p-4 animate-in fade-in font-sans">
      <div className="bg-white w-full max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 max-h-[90vh] flex flex-col">
        
        <div className="relative shrink-0 border-b border-zinc-100">
          {produto.image_url ? (
            <div className="w-full h-48 sm:h-56 bg-zinc-100 relative"><img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" /></div>
          ) : (<div className="pt-8 bg-zinc-50"></div>)}
          
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-full text-zinc-900 hover:bg-zinc-100 shadow-md transition-all z-10">
            <X size={20} className="stroke-[3px]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-50/50">
          <h2 className="text-2xl font-black text-zinc-900 leading-tight">{produto.name}</h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{produto.description}</p>
          <p className="text-xl font-black text-indigo-600 mt-4 border-b border-zinc-200 pb-6">R$ {Number(produto.price).toFixed(2).replace('.', ',')}</p>

          {temVariacoes && (
            <div className="mt-6 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
               <div className="bg-zinc-100/50 p-4 flex justify-between items-start border-b border-zinc-200">
                  <div>
                    <h3 className="font-black text-zinc-900 uppercase tracking-tight">Escolha o Sabor/Opção</h3>
                    <p className="text-xs font-bold text-zinc-500 mt-1">Escolha 1 opção obrigatória</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${variacaoSelecionada ? "bg-indigo-100 text-indigo-700" : "bg-zinc-800 text-white"}`}>
                      {variacaoSelecionada ? "Concluído" : "Obrigatório"}
                    </span>
                  </div>
               </div>
               <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {produto.variations.map((varItem: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setVariacaoSelecionada(varItem)}
                      className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center text-center ${variacaoSelecionada === varItem ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300"}`}
                    >
                      {varItem}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {loadingGrupos ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-400"/></div>
          ) : (
            <div className="mt-6 space-y-8">
              {gruposComplementos.map(grupo => {
                const totalNoGrupo = grupo.complement_items.reduce((acc: number, curr: any) => acc + (selecoes[curr.id] || 0), 0);
                const isCheck = grupo.max_items === 1;

                return (
                  <div key={grupo.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-zinc-100/50 p-4 flex justify-between items-start border-b border-zinc-200">
                      <div>
                        <h3 className="font-black text-zinc-900 uppercase tracking-tight">{grupo.name}</h3>
                        <p className="text-xs font-bold text-zinc-500 mt-1">
                          {grupo.max_items > 1 ? `Selecione até ${grupo.max_items} opções` : "Escolha 1 opção"}
                          {grupo.tipo_calculo === 'maior' && " • Cobrado pelo mais caro"}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {grupo.is_required && (
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${totalNoGrupo >= grupo.min_items ? "bg-indigo-100 text-indigo-700" : "bg-zinc-800 text-white"}`}>
                            {totalNoGrupo >= grupo.min_items ? "Concluído" : "Obrigatório"}
                          </span>
                        )}
                        <span className="text-xs font-bold text-zinc-400">{totalNoGrupo} / {grupo.max_items}</span>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-100">
                      {grupo.complement_items.map((item: any) => {
                        const qtdItem = selecoes[item.id] || 0;
                        const limitReached = totalNoGrupo >= grupo.max_items;

                        return (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/80 transition-colors">
                            <div className="flex-1 pr-4">
                              <h4 className="font-bold text-zinc-800 text-sm">{item.name}</h4>
                              {item.price > 0 && <p className="text-xs font-black text-indigo-600 mt-0.5">+ R$ {Number(item.price).toFixed(2).replace(".", ",")}</p>}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {grupo.max_items > 1 ? (
                                <>
                                  {qtdItem > 0 ? (
                                    <>
                                      <button onClick={() => alterarSelecao(grupo, item, 'remove')} className="w-8 h-8 rounded-full border-2 border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors"><Minus size={16} strokeWidth={3}/></button>
                                      <span className="font-black text-zinc-900 w-4 text-center">{qtdItem}</span>
                                    </>
                                  ) : <div className="w-[60px]"></div>}
                                  <button onClick={() => alterarSelecao(grupo, item, 'add')} disabled={limitReached && qtdItem === 0} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${limitReached && qtdItem === 0 ? "border-zinc-100 text-zinc-300" : "border-indigo-600 text-indigo-600 hover:bg-indigo-50"}`}><Plus size={16} strokeWidth={3}/></button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => {
                                    const novasSelecoes = { ...selecoes };
                                    grupo.complement_items.forEach((i: any) => delete novasSelecoes[i.id]);
                                    novasSelecoes[item.id] = 1;
                                    setSelecionados(novasSelecoes);
                                  }}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${qtdItem > 0 ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300"}`}
                                >
                                  {qtdItem > 0 && <CheckCircle2 size={16} strokeWidth={3} />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2"><AlertCircle size={16}/> Alguma observação?</h3>
            <textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Tirar cebola, carne bem passada..." className="w-full border border-zinc-300 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none shadow-inner" />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-white flex items-center gap-4 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center bg-zinc-100 rounded-xl">
            <button onClick={() => setQuantidadeGlobal(Math.max(1, quantidadeGlobal - 1))} className="p-3.5 text-zinc-500 hover:text-zinc-900 active:scale-95 transition-transform"><Minus size={18} strokeWidth={3} /></button>
            <span className="w-8 text-center font-black text-zinc-900">{quantidadeGlobal}</span>
            <button onClick={() => setQuantidadeGlobal(quantidadeGlobal + 1)} className="p-3.5 text-indigo-600 hover:text-indigo-800 active:scale-95 transition-transform"><Plus size={18} strokeWidth={3} /></button>
          </div>
          <button 
            onClick={handleAdicionarAoCarrinho} 
            disabled={!isPodeAdicionar} 
            className={`flex-1 font-black py-4 px-5 rounded-xl shadow-md transition-all flex justify-between items-center active:scale-95 ${!isAberta ? "bg-zinc-300 text-zinc-500 cursor-not-allowed" : !isPodeAdicionar ? "bg-zinc-300 text-zinc-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
          >
            <span>{!isAberta ? "Loja Fechada" : "Adicionar"}</span>
            {isAberta && <span>R$ {valorFinalTela.toFixed(2).replace('.', ',')}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}