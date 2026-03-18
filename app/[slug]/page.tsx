// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "next/navigation";
import ModalProduto from "../../components/ModalProduto";
import CarrinhoFlutuante from "../../components/CarrinhoFlutuante";
import CarrinhoLateral from "../../components/CarrinhoLateral";
import CheckoutModal from "../../components/CheckoutModal";
import { CartProvider } from "../../components/CartContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function VitrineLoja() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      carregarLoja();
    }
  }, [slug]);

 const carregarLoja = async () => {
    setLoading(true);

    // ==========================================
    // SISTEMA DE CACHE (Economiza Banco de Dados)
    // ==========================================
    const CACHE_KEY = `@saas_menu_${slug}`;
    const CACHE_TIME = 1000 * 60 * 15; // 15 minutos de validade do cache

    if (typeof window !== "undefined") {
      const cacheSalvo = localStorage.getItem(CACHE_KEY);
      if (cacheSalvo) {
        const { data, timestamp } = JSON.parse(cacheSalvo);
        
        // Se o cache ainda estiver dentro dos 15 minutos, usa ele e aborta o Supabase
        if (Date.now() - timestamp < CACHE_TIME) {
          setTenant(data.tenant);
          setProdutos(data.produtos);
          setLoading(false);
          return; // Pula a requisição ao banco!
        }
      }
    }

    // Se não tiver cache ou estiver vencido, busca no banco de dados
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (tenantData) {
      setTenant(tenantData);
      
      const { data: produtosData } = await supabase
        .from("products")
        .select("*, categories(name)") 
        .eq("tenant_id", tenantData.id)
        .order("name", { ascending: true }); 

      setProdutos(produtosData || []);

      // Salva os dados frescos no Cache do celular do cliente
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: { tenant: tenantData, produtos: produtosData || [] },
          timestamp: Date.now()
        }));
      }
    }
    setLoading(false);
  };

  // ========================================================
  // RASTREAMENTO INTELIGENTE: META PIXEL + GOOGLE ANALYTICS
  // ========================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      
      // 1. INJEÇÃO DO META PIXEL
      if (tenant?.meta_pixel_id) {
        const initMetaPixel = () => {
          // @ts-ignore
          if (window.fbq) return;
          // @ts-ignore
          const fbq = window.fbq = function() {
            // @ts-ignore
            fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
          };
          // @ts-ignore
          if (!window._fbq) window._fbq = fbq;
          fbq.push = fbq;
          fbq.loaded = true;
          fbq.version = '2.0';
          fbq.queue = [];
          
          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://connect.facebook.net/en_US/fbevents.js';
          document.head.appendChild(script);
        };

        initMetaPixel();
        // @ts-ignore
        window.fbq('init', tenant.meta_pixel_id);
        // @ts-ignore
        window.fbq('track', 'PageView');
      }

      // 2. INJEÇÃO DO GOOGLE ANALYTICS (GA4)
      if (tenant?.ga_measurement_id) {
        const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${tenant.ga_measurement_id}`;
        
        // Verifica se o script do GA já não foi injetado antes para evitar duplicação
        if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
          const script = document.createElement('script');
          script.async = true;
          script.src = scriptUrl;
          document.head.appendChild(script);

          // @ts-ignore
          window.dataLayer = window.dataLayer || [];
          // @ts-ignore
          function gtag(){window.dataLayer.push(arguments);}
          
          // @ts-ignore
          gtag('js', new Date());
          // @ts-ignore
          gtag('config', tenant.ga_measurement_id, {
            page_path: window.location.pathname,
          });
        }
      }
    }
  }, [tenant?.meta_pixel_id, tenant?.ga_measurement_id]);

  const scrollEsquerda = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollDireita = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
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

  const destaques = [...produtosFiltrados]
    .sort((a, b) => (b.total_vendas || 0) - (a.total_vendas || 0))
    .slice(0, 5);

  let categoriasUnicas = Array.from(new Set(produtosFiltrados.map(p => p.categories?.name || "Gerais")));

  categoriasUnicas.sort((catA, catB) => {
    const maxPrecoA = Math.max(...produtosFiltrados.filter(p => (p.categories?.name || "Gerais") === catA).map(p => Number(p.price) || 0));
    const maxPrecoB = Math.max(...produtosFiltrados.filter(p => (p.categories?.name || "Gerais") === catB).map(p => Number(p.price) || 0));
    return maxPrecoB - maxPrecoA;
  });

  return (
    <CartProvider tenantId={tenant.id}>
      <div className="min-h-screen bg-zinc-50 font-sans pb-20">
        
        <div className="w-full h-40 md:h-64 bg-zinc-200 relative">
          {tenant.cover_url && (
            <img src={tenant.cover_url} alt="Capa da Loja" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-12 md:-mt-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-100 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-zinc-400">{tenant.name.charAt(0)}</span>
              )}
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
            <div className="mb-12 relative group">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Os Mais Pedidos 🔥</h2>
                
                <div className="hidden sm:flex gap-2">
                  <button onClick={scrollEsquerda} className="p-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 transition-colors shadow-sm">
                    <ChevronLeft size={20}/>
                  </button>
                  <button onClick={scrollDireita} className="p-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 transition-colors shadow-sm">
                    <ChevronRight size={20}/>
                  </button>
                </div>
              </div>
              
              <div ref={carouselRef} className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar scroll-smooth">
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
              const produtosDaCategoria = produtosFiltrados.filter(p => (p.categories?.name || "Gerais") === categoria);
              
              if (produtosDaCategoria.length === 0) return null;

              return (
                <div key={categoria as string}>
                  <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">{categoria as string}</h2>
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
                        <div className="w-28 h-28 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-zinc-100">
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

        {produtoSelecionado && (
          <ModalProduto
            produto={produtoSelecionado}
            tenantId={tenant.id}
            onClose={() => setProdutoSelecionado(null)}
          />
        )}

        <div onClick={() => setIsCartOpen(true)}>
          <CarrinhoFlutuante onClick={() => setIsCartOpen(true)} />
        </div>

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