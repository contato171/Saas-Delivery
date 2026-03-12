"use client"; // Isso permite usar o clique (useState)

import { useState } from "react";
import ModalProduto from "./ModalProduto";

export default function ProdutoItem({ produto }: { produto: any }) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <>
      {/* O Card do Produto clicável */}
      <div 
        onClick={() => setModalAberto(true)}
        className="flex justify-between gap-4 p-4 bg-white border border-zinc-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer w-full h-full min-h-[140px]"
      >
        <div className="flex flex-col justify-between flex-1">
          <div>
            <h3 className="text-base text-zinc-800 font-medium">{produto.name}</h3>
            {produto.description && (
              <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                {produto.description}
              </p>
            )}
          </div>
          <p className="text-base text-zinc-800 mt-3 font-medium">
            R$ {produto.price.toFixed(2).replace(".", ",")}
          </p>
        </div>
        
        <div className="w-[120px] h-[80px] bg-zinc-100 rounded flex-shrink-0 overflow-hidden relative">
          {produto.image_url ? (
            <img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-300 bg-zinc-50">
              <span className="text-[10px] uppercase font-bold text-center px-2">Sem foto</span>
            </div>
          )}
        </div>
      </div>

      {/* Se o modalAberto for true, ele renderiza a nossa peça na tela */}
      {modalAberto && (
        <ModalProduto produto={produto} onClose={() => setModalAberto(false)} />
      )}
    </>
  );
}