"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import CarrinhoLateral from "./CarrinhoLateral";

export default function TopBarWeb({ nome }: { nome: string }) {
  const { quantidadeTotal, totalCarrinho } = useCart();
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {nome.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-red-600 hidden sm:block truncate max-w-[150px]">
              {nome}
            </span>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <div className="bg-zinc-100 rounded-md flex items-center px-4 py-3 h-12 w-full">
              <span className="text-red-600 text-lg mr-3">⌕</span>
              <input 
                type="text" 
                placeholder="Busque por item ou loja" 
                className="bg-transparent border-none outline-none w-full text-zinc-700 placeholder-zinc-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-1 text-zinc-600 text-sm cursor-pointer hover:text-red-600 transition-colors">
              <span>Seu endereço</span>
              <span className="text-red-600 rotate-90 font-bold">›</span>
            </div>
            
            {/* O Botão da Sacola agora é funcional! */}
            <button 
              onClick={() => setCarrinhoAberto(true)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <span className="text-2xl text-red-600">🛍️</span>
                {quantidadeTotal > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {quantidadeTotal}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-zinc-500 text-[10px] uppercase font-bold leading-none">Sacola</span>
                <span className="text-zinc-800 text-sm font-bold leading-none mt-1">
                  R$ {totalCarrinho.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* A nossa gaveta do carrinho (vai aparecer quando o estado for true) */}
      {carrinhoAberto && (
        <CarrinhoLateral onClose={() => setCarrinhoAberto(false)} />
      )}
    </>
  );
}