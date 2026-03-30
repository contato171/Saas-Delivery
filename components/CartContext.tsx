"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<any[]>([]);
  const [cupomAtivo, setCupomAtivo] = useState<{codigo: string, desconto: number} | null>(null);

  // Carrega a sacola salva
  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem("@saas_cart");
    if (carrinhoSalvo) {
      try { setItens(JSON.parse(carrinhoSalvo)); } catch (e) {}
    }
  }, []);

  // Atualiza a memória sempre que um item entra ou sai
  useEffect(() => {
    localStorage.setItem("@saas_cart", JSON.stringify(itens));
  }, [itens]);

  // Modificado: Adicionamos variacao no final para não quebrar produtos normais
  const adicionarItem = (produto: any, quantidade: number, adicionais: any[] = [], observacao: string = "", variacao: string | null = null) => {
    // MATEMÁTICA CORRETA: Preço do Produto + Soma de todos os adicionais * Quantidade
    const valorAdicionais = adicionais.reduce((acc, add) => acc + Number(add.price), 0);
    const precoUnitario = Number(produto.price) + valorAdicionais;
    const precoTotal = precoUnitario * quantidade;

    const novoItem = {
      id: Math.random().toString(36).substr(2, 9),
      produto,
      quantidade,
      adicionais,
      observacao,
      variacao, // <--- Aqui o sabor entra no item do carrinho
      precoTotal
    };

    setItens([...itens, novoItem]);
  };

  const removerItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
    // Se esvaziar a sacola, remove o cupom por segurança
    if (itens.length <= 1) setCupomAtivo(null);
  };

  // MATEMÁTICA GLOBAL
  const subtotal = itens.reduce((acc, item) => acc + (item.precoTotal || 0), 0);
  const valorDesconto = cupomAtivo ? subtotal * (cupomAtivo.desconto / 100) : 0;
  const totalCarrinho = subtotal - valorDesconto;

  return (
    <CartContext.Provider value={{ 
      itens, adicionarItem, removerItem, 
      subtotal, totalCarrinho, 
      cupomAtivo, setCupomAtivo, valorDesconto 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);