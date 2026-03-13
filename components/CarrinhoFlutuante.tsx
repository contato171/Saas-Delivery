"use client";

import { useCart } from "./CartContext";

export default function CarrinhoFlutuante({ onClick }: { onClick: () => void }) {
  // Agora ele lê a quantidade REAL de itens no cérebro global
  const { itens, totalCarrinho } = useCart();
  
  // Calcula o total de itens, somando a quantidade de cada produto
  const quantidadeTotal = itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);

  // Se o carrinho estiver vazio, ele some da tela
  if (quantidadeTotal === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-700 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-5 z-[100]">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
          </p>
          <p className="text-xl font-black text-white">
            R$ {(totalCarrinho || 0).toFixed(2).replace(".", ",")}
          </p>
        </div>
        {/* Este botão dispara a função onClick que a Vitrine vai mandar para ele */}
        <button 
          onClick={onClick}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-red-500 transition-colors"
        >
          Ver Sacola
        </button>
      </div>
    </div>
  );
}