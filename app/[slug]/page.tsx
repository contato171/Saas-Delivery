"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "../../lib/supabase";
import ModalProduto from "../../components/ModalProduto";
import CheckoutModal from "../../components/CheckoutModal";
import CarrinhoLateral from "../../components/CarrinhoLateral";
import { useCart } from "../../components/CartContext";
import { ShoppingBag, Loader2, MapPin, Clock } from "lucide-react";

export default function VitrineLoja({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  
  // Controles de Tela Independentes
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);

  const cartInfo = useCart() as any;
  const itens = cartInfo.itens || [];

  useEffect(() => {
    async function carregarVitrine() {
      const { data: tenantData } = await supabase.from("tenants").select("*").eq("slug", slug).single();
      if (tenantData) {
        setTenant(tenantData);
        const { data: produtosData } = await supabase.from("products").select("*").eq("tenant_id", tenantData.id);
        if (produtosData) setProdutos(produtosData);
      }
      setLoading(false);
    }
    carregarVitrine();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="animate-spin text-red-600" size={40}/></div>;
  if (!tenant) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500 font-bold">Loja não encontrada.</div>;

  const produtosPorCategoria = produtos.reduce((acc: any, produto: any) => {
    const cat = produto.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(produto);
    return acc;
  }, {});

  const totalCarrinhoNumber = cartInfo.totalCarrinho || 0;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-24">
      
      <header className="bg-white border-b border-zinc-200 pt-6 pb-6 px-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-md shrink-0">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 leading-tight">{tenant.name}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-medium">
                <span className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-md"><MapPin size={12}/> Raio {tenant.delivery_radius_km || 10}km</span>
                <span className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-md"><Clock size={12}/> 30-45 min</span>
              </div>
            </div>
          </div>

          {/* SACOLA NO CANTO SUPERIOR DIREITO */}
          <button 
            onClick={() => setCarrinhoAberto(true)}
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <div className="relative">
              <ShoppingBag size={20} />
              {itens.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-zinc-900 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-red-600">
                  {itens.length}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">R$ {totalCarrinhoNumber.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {Object.keys(produtosPorCategoria).map(categoria => (
          <div key={categoria} className="animate-in fade-in">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">{categoria}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {produtosPorCategoria[categoria].map((prod: any) => (
                <div key={prod.id} onClick={() => setProdutoSelecionado(prod)} className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow group">
                  <div className="flex-1">
                    <h3 className="font-bold text-zinc-900 text-sm leading-tight group-hover:text-red-600 transition-colors">{prod.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{prod.description}</p>
                    <p className="font-black text-red-600 mt-3">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>
                  </div>
                  {prod.image_url && (
                    <div className="w-24 h-24 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-zinc-100">
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover"/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {produtoSelecionado && <ModalProduto produto={produtoSelecionado} tenantId={tenant.id} onClose={() => setProdutoSelecionado(null)} />}
      
      {/* ABRE A GAVETA LATERAL PRIMEIRO */}
      {carrinhoAberto && (
        <CarrinhoLateral 
          tenant={tenant} 
          onClose={() => setCarrinhoAberto(false)} 
          onCheckout={() => {
            setCarrinhoAberto(false);
            setCheckoutAberto(true);
          }} 
        />
      )}

      {/* O CHECKOUT SÓ ABRE DEPOIS QUE SAIR DA GAVETA */}
      {checkoutAberto && <CheckoutModal onClose={() => setCheckoutAberto(false)} />}
    </div>
  );
}