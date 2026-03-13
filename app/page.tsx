// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "next/navigation";
import ModalProduto from "../../components/ModalProduto";
import CarrinhoFlutuante from "../../components/CarrinhoFlutuante";
import CarrinhoLateral from "../../components/CarrinhoLateral";
import CheckoutModal from "../../components/CheckoutModal";
import { CartProvider } from "../../components/CartContext";

export default function VitrineLoja() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // O cérebro da tela: controla o que abre e fecha
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      carregarLoja();
    }
  }, [slug]);

  const carregarLoja = async () => {
    setLoading(true);
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (tenantData) {
      setTenant(tenantData);
      const { data: produtosData } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("total_vendas", { ascending: false });

      setProdutos(produtosData || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500 font-medium">Carregando cardápio...</div>;
  }

  if (!tenant) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500 font-medium">Restaurante não encontrado.</div>;
  }

  const produtosFiltrados = produtos.filter((p) => 
    p.name.toLowerCase().includes(busca.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(busca.toLowerCase()))
  );

  let destaques = produtosFiltrados.filter(p => p.destaque);
  if (destaques.length === 0) {
    destaques = produtosFiltrados.slice(0, 4);
  }

  const categoriasUnicas = Array.from(new Set(produtosFiltrados.map(p => p.categoria || "Gerais")));

  return (
    <CartProvider tenantId={tenant.id}>
      <div className="min-h-screen bg-zinc-50 font-sans pb-20">
        
        {/* HEADER: Capa e Logo */}
        <div className="w-full h-40 md:h-64 bg-zinc-200 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-12 md:-mt-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-100 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              <span className="font-black text-zinc-400">{tenant.name.charAt(0)}</span>
            </div>
            <div className="text-center sm:text-left pt-2 md:pt-6 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">{tenant.name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm text-zinc-500">
                <span className="text-amber-500 font-bold">★ 4.9</span>
                <span>•</span>
                <span>Lanches e Bebidas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          
          <div className="relative mb-10">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-zinc-400">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Buscar no cardápio"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-zinc-800 placeholder:text-zinc-400"
            />
          </div>

          {destaques.length > 0 && busca === "" && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">Destaques</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                {destaques.map((produto) => (
                  <div 
                    key={produto.id} 
                    onClick={() => setProdutoSelecionado(produto)}
                    className="min-w-[260px] max-w-[260px] sm:min-w-[280px] bg-white border border-zinc-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow snap-start flex flex-col"
                  >
                    <div className="w-full h-36 bg-zinc-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden shrink-0">
                      {produto.image_url ? (
                        <img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl opacity-50">🍔</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-800 leading-tight mb-1">{produto.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3 flex-1">{produto.description}</p>
                    <span className="font-bold text-emerald-600 block">R$ {Number(produto.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-10">
            {categoriasUnicas.map((categoria) => {
              const produtosDaCategoria = produtosFiltrados.filter(p => (p.categoria || "Gerais") === categoria);
              
              if (produtosDaCategoria.length === 0) return null;

              return (
                <div key={categoria}>
                  <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">{categoria}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {produtosDaCategoria.map((produto) => (
                      <div 
                        key={produto.id} 
                        onClick={() => setProdutoSelecionado(produto)}
                        className="bg-white border border-zinc-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all flex justify-between gap-4"
                      >
                        <div className="flex flex-col flex-1">
                          <h3 className="font-semibold text-zinc-800 mb-1">{produto.name}</h3>
                          <p className="text-sm text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{produto.description}</p>
                          <span className="font-medium text-emerald-600 mt-auto">R$ {Number(produto.price).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="w-28 h-28 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                          {produto.image_url ? (
                            <img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl opacity-50">🍔</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAIS: A ordem correta sem travar a tela */}
        {produtoSelecionado && (
          <ModalProduto
            produto={produtoSelecionado}
            tenantId={tenant.id}
            onClose={() => setProdutoSelecionado(null)}
          />
        )}

        {/* O flutuante abre a lateral */}
        <div onClick={() => setIsCartOpen(true)}>
          <CarrinhoFlutuante tenant={tenant} />
        </div>

        {/* A lateral fecha ela mesma e abre o checkout */}
        {isCartOpen && (
          <CarrinhoLateral 
            tenant={tenant} 
            onClose={() => setIsCartOpen(false)} 
            onCheckout={() => {
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }} 
          />
        )}

        {isCheckoutOpen && (
          <CheckoutModal 
            tenant={tenant} 
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)} 
          />
        )}
        
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </div>
    </CartProvider>
  );
}