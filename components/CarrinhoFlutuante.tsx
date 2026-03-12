"use client";

import { useState } from "react";

export default function CarrinhoFlutuante() {
  // Esse estado vive SÓ dentro do carrinho. Não quebra a página de fora!
  const [quantidade, setQuantidade] = useState(0);
  const [total, setTotal] = useState(0);

  // Se o carrinho estiver vazio, ele nem aparece na tela
  if (quantidade === 0) {
    return (
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={() => { setQuantidade(1); setTotal(35.90); }} 
          className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-full text-xs border border-zinc-700 hover:text-white transition-colors"
        >
          Testar Carrinho (Simular clique)
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-700 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-5">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            {quantidade} {quantidade === 1 ? 'item' : 'itens'}
          </p>
          <p className="text-xl font-black text-white">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <button 
          onClick={() => alert("Próximo passo: Tela de Checkout!")}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-500 transition-colors"
        >
          Finalizar Pedido
        </button>
      </div>
    </div>
  );
}