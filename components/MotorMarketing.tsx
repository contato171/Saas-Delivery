// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Wand2, Target, Megaphone, Loader2, Image as ImageIcon,
  Clock, MapPin, Edit3, DollarSign, Search, Layers, ChevronDown, ChevronUp,
  ImagePlay, Film, UploadCloud, Wallet, ExternalLink, AlertTriangle, CheckCircle2, Plug, Facebook,
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, X, PlusCircle, PauseCircle, PlayCircle, 
  BarChart3, MousePointerClick, TrendingUp, AlertCircle, Archive, LineChart, Eye, ShoppingCart, CreditCard, Activity, CalendarDays
} from "lucide-react";

export default function MotorMarketing({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<"metricas" | "ativas" | "pausadas" | "criar">("metricas");

  // Filtro de Datas
  const [filtroData, setFiltroData] = useState<"hoje" | "ontem" | "7dias" | "30dias" | "mes" | "custom">("7dias");
  const [dataCustomInicio, setDataCustomInicio] = useState("");
  const [dataCustomFim, setDataCustomFim] = useState("");

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [tipoAnuncio, setTipoAnuncio] = useState<"single" | "carousel">("single");
  
  const [midiaUpload, setMidiaUpload] = useState<File | null>(null);
  const [midiaPreview, setMidiaPreview] = useState<string | null>(null);
  const [midiaType, setMidiaType] = useState<"image" | "video" | null>(null);

  const [midiaCarrossel, setMidiaCarrossel] = useState<Record<string, { file: File, preview: string, type: string }>>({});
  
  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem(`@saas_marketing_categorias_${tenantId}`);
      return salvo ? JSON.parse(salvo) : {};
    }
    return {};
  });
  
  const [buscaCidade, setBuscaCidade] = useState("");
  const [resultadosBuscaCidade, setResultadosBuscaCidade] = useState<any[]>([]);
  const [buscandoCidades, setBuscandoCidades] = useState(false);
  const [cidadeSelecionadaMeta, setCidadeSelecionadaMeta] = useState<any | null>(null);

  const [orcamentoTotal, setOrcamentoTotal] = useState<number>(70);
  const [diasVeiculacao, setDiasVeiculacao] = useState<number>(7);
  const [horarioInicio, setHorarioInicio] = useState("18:00");
  const [horarioFim, setHorarioFim] = useState("23:30");

  const [anuncioGerado, setAnuncioGerado] = useState<{ hook: string; body: string; cta: string; } | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [publicadoSucesso, setPublicadoSucesso] = useState(false);

  const [campanhasMeta, setCampanhasMeta] = useState<any[]>([]);
  const [processandoStatus, setProcessandoStatus] = useState<string | null>(null);

  const [metricasMeta, setMetricasMeta] = useState({
    gasto: 0, impressoes: 0, alcance: 0, cliques: 0, addCarrinho: 0, checkouts: 0, compras: 0
  });

  const [metricasNexus, setMetricasNexus] = useState({
    acessos: 0, 
    carrinhoQtd: 0, carrinhoValor: 0, 
    checkoutQtd: 0, checkoutValor: 0, 
    comprasQtd: 0, comprasValor: 0
  });

  const getIntervaloDatas = () => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    if (filtroData === "hoje") {
      // Mantém hoje
    } else if (filtroData === "ontem") {
      inicio.setDate(hoje.getDate() - 1);
      fim.setDate(hoje.getDate() - 1);
    } else if (filtroData === "7dias") {
      inicio.setDate(hoje.getDate() - 7);
    } else if (filtroData === "30dias") {
      inicio.setDate(hoje.getDate() - 30);
    } else if (filtroData === "mes") {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (filtroData === "custom" && dataCustomInicio && dataCustomFim) {
      inicio = new Date(dataCustomInicio);
      fim = new Date(dataCustomFim);
    }

    const metaSince = inicio.toISOString().split('T')[0];
    const metaUntil = fim.toISOString().split('T')[0];

    inicio.setHours(0, 0, 0, 0);
    fim.setHours(23, 59, 59, 999);

    return { metaSince, metaUntil, supaStart: inicio.toISOString(), supaEnd: fim.toISOString() };
  };

  useEffect(() => {
    async function carregarDados() {
      const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (tenantData) setTenant(tenantData);

      const { data: prodData } = await supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).order("name");
      if (prodData) setProdutos(prodData);
      
      const { data: integracao } = await supabase.from("tenant_integrations").select("*").eq("tenant_id", tenantId).maybeSingle();
      
      if (integracao && integracao.facebook_access_token) {
        setAccessToken(integracao.facebook_access_token);
        
        if (tenantData?.meta_ad_account_id) {
           const actId = tenantData.meta_ad_account_id.startsWith('act_') ? tenantData.meta_ad_account_id : `act_${tenantData.meta_ad_account_id}`;
           fetch(`https://graph.facebook.com/v19.0/${actId}/campaigns?fields=id,name,status,insights{spend,clicks,cpc}&access_token=${integracao.facebook_access_token}`)
             .then(res => res.json())
             .then(data => {
                if (data.data) {
                  const campanhasReais = data.data.map((c: any) => {
                     const ins = c.insights?.data?.[0] || {};
                     return {
                       id: c.id, nome: c.name, status: c.status,
                       gasto: ins.spend ? Number(ins.spend) : 0,
                       cliques: ins.clicks ? Number(ins.clicks) : 0,
                       custoPorClique: ins.cpc ? Number(ins.cpc) : 0
                     };
                  });
                  setCampanhasMeta(campanhasReais.filter(c => c.status !== 'ARCHIVED'));
                }
             })
             .catch(err => console.error("Erro ao buscar campanhas:", err));
        }
      }
      setLoading(false);
    }
    carregarDados();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || (!accessToken && !tenant)) return;
    
    async function buscarMetricas() {
      setLoadingMetricas(true);
      const datas = getIntervaloDatas();

      if (accessToken && tenant?.meta_ad_account_id) {
        try {
          const actId = tenant.meta_ad_account_id.startsWith('act_') ? tenant.meta_ad_account_id : `act_${tenant.meta_ad_account_id}`;
          const timeRange = JSON.stringify({ since: datas.metaSince, until: datas.metaUntil });
          
          const res = await fetch(`https://graph.facebook.com/v19.0/${actId}/insights?time_range=${timeRange}&fields=spend,impressions,reach,clicks,actions&access_token=${accessToken}`);
          const metaData = await res.json();

          if (metaData.data && metaData.data.length > 0) {
            const ins = metaData.data[0];
            let addCart = 0, chk = 0, pur = 0;

            if (ins.actions) {
              ins.actions.forEach((a: any) => {
                if (a.action_type.includes('add_to_cart')) addCart += Number(a.value);
                if (a.action_type.includes('initiate_checkout')) chk += Number(a.value);
                if (a.action_type.includes('purchase')) pur += Number(a.value);
              });
            }

            setMetricasMeta({
              gasto: Number(ins.spend || 0),
              impressoes: Number(ins.impressions || 0),
              alcance: Number(ins.reach || 0),
              cliques: Number(ins.clicks || 0),
              addCarrinho: addCart,
              checkouts: chk,
              compras: pur
            });
          } else {
            setMetricasMeta({ gasto: 0, impressoes: 0, alcance: 0, cliques: 0, addCarrinho: 0, checkouts: 0, compras: 0 });
          }
        } catch (error) {
          console.error("Erro ao puxar insights do Meta", error);
        }
      }

      try {
        const { data: analytics } = await supabase
          .from('store_analytics')
          .select('event_type, value')
          .eq('tenant_id', tenantId)
          .gte('created_at', datas.supaStart)
          .lte('created_at', datas.supaEnd);

        let acessos = 0, cQtd = 0, cVal = 0, chkQtd = 0, chkVal = 0;
        
        if (analytics) {
          analytics.forEach(ev => {
             if (ev.event_type === 'visit') acessos++;
             if (ev.event_type === 'add_to_cart') { cQtd++; cVal += Number(ev.value || 0); }
             if (ev.event_type === 'checkout_start') { chkQtd++; chkVal += Number(ev.value || 0); }
          });
        }

        const { data: pedidos } = await supabase
          .from('orders')
          .select('status, total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', datas.supaStart)
          .lte('created_at', datas.supaEnd);

        let pQtd = 0, pVal = 0;
        if (pedidos) {
          pedidos.forEach(p => {
             if (p.status === 'concluido' || p.status === 'pago' || p.status === 'entregue') {
               pQtd++; pVal += Number(p.total_amount || 0);
             }
          });
        }

        setMetricasNexus({
          acessos: acessos,
          carrinhoQtd: cQtd, carrinhoValor: cVal,
          checkoutQtd: chkQtd, checkoutValor: chkVal,
          comprasQtd: pQtd, comprasValor: pVal
        });

      } catch (error) {
        console.error("Erro ao puxar dados do Nexus", error);
      }

      setLoadingMetricas(false);
    }

    if (filtroData !== "custom" || (dataCustomInicio && dataCustomFim)) {
      buscarMetricas();
    }
  }, [tenantId, accessToken, tenant, filtroData, dataCustomInicio, dataCustomFim]);

  const isIntegracaoCompleta = tenant?.meta_page_id && tenant?.meta_ad_account_id && tenant?.meta_pixel_id && accessToken;

  const campanhasAtivas = campanhasMeta.filter(c => c.status === 'ACTIVE');
  const campanhasPausadas = campanhasMeta.filter(c => c.status !== 'ACTIVE');

  const labelTempoFiltrado = {
    "hoje": "Hoje",
    "ontem": "Ontem",
    "7dias": "nos últimos 7 dias",
    "30dias": "nos últimos 30 dias",
    "mes": "neste mês",
    "custom": "no período selecionado"
  }[filtroData];

  const handleAdicionarSaldoMeta = () => {
    if (!tenant?.meta_ad_account_id) return;
    const actId = tenant.meta_ad_account_id.replace("act_", "");
    window.open(`https://business.facebook.com/billing_hub/accounts/details?asset_id=${actId}`, "_blank");
  };

  const toggleProduto = (prod: any) => {
    if (tipoAnuncio === "single") {
      if (produtosSelecionados.find(p => p.id === prod.id)) {
        setProdutosSelecionados([]); setMidiaUpload(null); setMidiaPreview(null); setMidiaType(null);
      } else {
        setProdutosSelecionados([prod]);
      }
    } else {
      if (produtosSelecionados.find(p => p.id === prod.id)) {
        setProdutosSelecionados(produtosSelecionados.filter(p => p.id !== prod.id));
        setMidiaCarrossel(prev => {
          const novo = { ...prev };
          delete novo[prod.id];
          return novo;
        });
      } else {
        if (produtosSelecionados.length < 10) setProdutosSelecionados([...produtosSelecionados, prod]);
        else alert("Máximo de 10 produtos permitidos no carrossel.");
      }
    }
  };

  const toggleCategoriaVisivel = (categoriaNome: string) => {
    setCategoriasAbertas(prev => {
      const novo = { ...prev, [categoriaNome]: !prev[categoriaNome] };
      localStorage.setItem(`@saas_marketing_categorias_${tenantId}`, JSON.stringify(novo));
      return novo;
    });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMidiaUpload(file); setMidiaPreview(URL.createObjectURL(file)); setMidiaType(file.type.startsWith('video/') ? 'video' : 'image');
  };

  const handleMediaCarouselUpload = (e: React.ChangeEvent<HTMLInputElement>, prodId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMidiaCarrossel(prev => ({
      ...prev,
      [prodId]: { file, preview: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' }
    }));
  };

  const gerarAnuncioIA = async () => {
    setEtapa(2); 
    try {
      const res = await fetch('/api/ai/gerar-anuncio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos: produtosSelecionados, tenantName: tenant?.name || "Restaurante", tipoAnuncio })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAnuncioGerado({ hook: data.hook, body: data.body, cta: data.cta });
      setEtapa(3); 
    } catch (error) {
      setAnuncioGerado({ hook: "Bateu aquela fome? 🤤", body: "Temos a melhor comida da cidade! Peça agora e comprove.", cta: "👉 Clique aqui e faça seu pedido!" });
      setEtapa(3);
    }
  };

  const handleCopyChange = (field: "hook" | "body" | "cta", value: string) => {
    if (anuncioGerado) {
      setAnuncioGerado({ ...anuncioGerado, [field]: value });
    }
  };

  const buscarCidadeMeta = async () => {
    if (!buscaCidade.trim() || buscaCidade.length < 3) return;
    setBuscandoCidades(true); setResultadosBuscaCidade([]);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/search?type=adgeolocation&q=${encodeURIComponent(buscaCidade)}&access_token=${accessToken}`);
      const data = await res.json();
      if (data.data) setResultadosBuscaCidade(data.data.filter((loc: any) => loc.type === 'city'));
    } catch (error) {} finally { setBuscandoCidades(false); }
  };

  const publicarNaMeta = async () => {
    if (orcamentoTotal / diasVeiculacao < 10) return alert("A verba diária mínima é de R$ 10,00.");
    if (!cidadeSelecionadaMeta) return alert("Por favor, selecione uma cidade para a entrega.");

    setPublicando(true);
    try {
      let uploadedUrl = null;
      let produtosComMidiaFinal = [...produtosSelecionados];

      if (tipoAnuncio === "single" && midiaUpload) {
        const ext = midiaUpload.name.split('.').pop();
        const fileName = `ads/${tenantId}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('cardapio').upload(fileName, midiaUpload);
        if (error) throw new Error("Erro ao enviar a mídia principal.");
        const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      }

      if (tipoAnuncio === "carousel") {
        for (let i = 0; i < produtosComMidiaFinal.length; i++) {
          const prod = produtosComMidiaFinal[i];
          const customMedia = midiaCarrossel[prod.id];
          
          if (customMedia && customMedia.file) {
            const ext = customMedia.file.name.split('.').pop();
            const fileName = `ads/${tenantId}_${prod.id}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('cardapio').upload(fileName, customMedia.file);
            if (!error) {
              const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName);
              produtosComMidiaFinal[i] = { ...prod, custom_media_url: data.publicUrl, custom_media_type: customMedia.type };
            }
          }
        }
      }

      const payload = {
        tenantId, tipoAnuncio, 
        produtos: produtosComMidiaFinal, 
        midiaUnicaUrl: uploadedUrl || (tipoAnuncio === "single" ? produtosSelecionados[0].image_url : null),
        midiaType: midiaType || 'image', orcamentoTotal, diasVeiculacao, cidadeMeta: cidadeSelecionadaMeta, 
        anuncioGerado, accessToken,
        adAccountId: tenant.meta_ad_account_id, 
        pageId: tenant.meta_page_id, 
        pixelId: tenant.meta_pixel_id, 
        horarioInicio, horarioFim
      };

      const res = await fetch('/api/meta/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPublicadoSucesso(true);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setPublicando(false);
    }
  };

  const toggleStatusCampanha = async (id: string, statusAtual: string) => {
    setProcessandoStatus(id);
    try {
      const novoStatus = statusAtual === "ACTIVE" ? "PAUSED" : "ACTIVE";
      
      const res = await fetch(`https://graph.facebook.com/v19.0/${id}?status=${novoStatus}&access_token=${accessToken}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success || data.id) {
        setCampanhasMeta(campanhasMeta.map(c => c.id === id ? { ...c, status: novoStatus } : c));
      } else {
        alert("Erro ao alterar o status. Verifique se o token de acesso do Meta não expirou.");
      }
    } catch (error) {
      console.error(error);
      alert("Falha de conexão com os servidores da Meta.");
    } finally {
      setProcessandoStatus(null);
    }
  };

  const produtosAgrupados = produtos.filter(p => p.name.toLowerCase().includes(buscaProduto.toLowerCase()) || (p.description && p.description.toLowerCase().includes(buscaProduto.toLowerCase())))
    .reduce((acc, prod) => { const catName = prod.categories?.name || "Geral"; if (!acc[catName]) acc[catName] = []; acc[catName].push(prod); return acc; }, {} as Record<string, any[]>);

  const podeConfigurarCampanha = tipoAnuncio === "single" ? produtosSelecionados.length === 1 : produtosSelecionados.length >= 2;

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  if (!isIntegracaoCompleta) {
    return (
      <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
        <div><h1 className="text-3xl font-black flex items-center gap-3"><span className="bg-indigo-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>Marketing</h1></div>
        <div className="bg-white max-w-2xl mx-auto rounded-2xl border border-zinc-200 shadow-sm p-10 text-center mt-10">
          <Plug size={48} className="mx-auto text-zinc-300 mb-6" />
          <h2 className="text-2xl font-black mb-3">Configuração Incompleta</h2>
          <p className="text-zinc-500 mb-8">Para usar o Gerenciador de Anúncios, você precisa primeiro conectar seu Facebook e configurar sua Página e Conta de Anúncios.</p>
          <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            Acesse o menu "Integrações" na barra lateral para concluir a configuração.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-6xl mx-auto">
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl"><Megaphone size={24}/></span>Marketing
          </h1>
          <p className="text-zinc-500 mt-1">Gerencie seus anúncios e gere campanhas automaticamente com IA.</p>
        </div>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 flex items-center gap-6">
          <div><p className="text-[10px] font-bold text-zinc-400 uppercase"><Wallet size={12} className="inline mr-1"/> Saldo da Conta</p><p className="text-sm font-bold text-zinc-800">Adicionar Fundos</p></div>
          <button onClick={handleAdicionarSaldoMeta} className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"><ExternalLink size={16}/> Recarregar</button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO DO MARKETING */}
      <div className="flex gap-2 border-b border-zinc-200 pb-px overflow-x-auto">
        <button onClick={() => setAbaAtiva("metricas")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "metricas" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <LineChart size={18}/> Desempenho
        </button>
        <button onClick={() => setAbaAtiva("ativas")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "ativas" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <BarChart3 size={18}/> Campanhas Ativas
        </button>
        <button onClick={() => setAbaAtiva("pausadas")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "pausadas" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <Archive size={18}/> Pausadas / Concluídas
        </button>
        <button onClick={() => setAbaAtiva("criar")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "criar" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          <PlusCircle size={18}/> Criar Novo Anúncio (IA)
        </button>
      </div>

      <div className="mt-6">
        
        {/* ABA 0: DESEMPENHO E MÉTRICAS */}
        {abaAtiva === "metricas" && (
          <div className="space-y-6 animate-in slide-in-from-left-2">
            
            {/* CONTROLE DE FILTRO DE DATAS */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
               <div className="flex items-center gap-2 text-zinc-800 font-bold">
                  <CalendarDays size={20} className="text-indigo-600"/>
                  Período de Análise
               </div>
               <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <select 
                    value={filtroData} 
                    onChange={e => setFiltroData(e.target.value as any)} 
                    className="border border-zinc-300 rounded-xl p-2.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-600 bg-zinc-50 cursor-pointer flex-1 sm:flex-none"
                  >
                    <option value="hoje">Hoje</option>
                    <option value="ontem">Ontem</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="mes">Este Mês</option>
                    <option value="custom">Personalizado...</option>
                  </select>

                  {filtroData === "custom" && (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                       <input type="date" value={dataCustomInicio} onChange={e => setDataCustomInicio(e.target.value)} className="border border-zinc-300 p-2 text-sm rounded-lg outline-none focus:border-indigo-600" />
                       <span className="text-zinc-400 text-xs font-bold">até</span>
                       <input type="date" value={dataCustomFim} onChange={e => setDataCustomFim(e.target.value)} className="border border-zinc-300 p-2 text-sm rounded-lg outline-none focus:border-indigo-600" />
                    </div>
                  )}
               </div>
            </div>

            {loadingMetricas ? (
               <div className="flex justify-center p-12 bg-white rounded-3xl border border-zinc-200"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
            ) : (
               <>
                  {/* SESSÃO 1: MÉTRICAS DO FACEBOOK */}
                  <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-zinc-100 bg-[#1877F2]/5 flex items-center gap-3">
                      <Facebook className="text-[#1877F2]" size={24}/>
                      <div>
                        <h2 className="font-black text-[#1877F2]">Resultados dos Anúncios (Meta)</h2>
                        <p className="text-xs text-zinc-500">Métricas das contas de anúncio {labelTempoFiltrado}</p>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12}/> Valor Gasto</p>
                        <p className="text-2xl font-black text-zinc-900">R$ {metricasMeta.gasto.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Eye size={12}/> Impressões</p>
                        <p className="text-2xl font-black text-zinc-900">{metricasMeta.impressoes.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Target size={12}/> Alcance (Pessoas Únicas)</p>
                        <p className="text-2xl font-black text-zinc-900">{metricasMeta.alcance.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><MousePointerClick size={12}/> Cliques no Link</p>
                        <p className="text-2xl font-black text-zinc-900">{metricasMeta.cliques.toLocaleString('pt-BR')}</p>
                      </div>
                      
                      <div className="space-y-1 pt-4 border-t border-zinc-100 md:col-span-4 grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><ShoppingCart size={12}/> Adições ao Carrinho</p>
                          <p className="text-lg font-black text-zinc-800">{metricasMeta.addCarrinho.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><CreditCard size={12}/> Checkouts Iniciados</p>
                          <p className="text-lg font-black text-zinc-800">{metricasMeta.checkouts.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={12}/> Compras Rastreadas (Meta)</p>
                          <p className="text-lg font-black text-emerald-600">{metricasMeta.compras.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SESSÃO 2: MÉTRICAS DA LOJA NEXUS */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl text-white relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div className="p-5 border-b border-white/10 flex items-center gap-3 relative z-10">
                      <Activity className="text-indigo-400" size={24}/>
                      <div>
                        <h2 className="font-black text-white">Desempenho no Cardápio</h2>
                        <p className="text-xs text-zinc-400">O que aconteceu de verdade no seu cardápio {labelTempoFiltrado}</p>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10 divide-y md:divide-y-0 md:divide-x divide-white/10">
                      
                      <div className="space-y-1 md:pr-6 pb-4 md:pb-0">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Acessos ao Cardápio</p>
                        <p className="text-3xl font-black text-white">{metricasNexus.acessos.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-zinc-500">Visitantes registrados</p>
                      </div>

                      <div className="space-y-1 md:px-6 py-4 md:py-0">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Adições ao Carrinho</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-indigo-400">{metricasNexus.carrinhoQtd}</p>
                          <p className="text-sm font-bold text-zinc-400 mb-1">pedidos</p>
                        </div>
                        <p className="text-xs text-emerald-400 font-bold">R$ {metricasNexus.carrinhoValor.toFixed(2).replace('.', ',')} retidos</p>
                      </div>

                      <div className="space-y-1 md:px-6 py-4 md:py-0">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Checkouts Iniciados</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-purple-400">{metricasNexus.checkoutQtd}</p>
                          <p className="text-sm font-bold text-zinc-400 mb-1">pedidos</p>
                        </div>
                        <p className="text-xs text-emerald-400 font-bold">R$ {metricasNexus.checkoutValor.toFixed(2).replace('.', ',')} na fila</p>
                      </div>

                      <div className="space-y-1 md:pl-6 pt-4 md:pt-0">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Compras Concluídas</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-emerald-400">{metricasNexus.comprasQtd}</p>
                          <p className="text-sm font-bold text-zinc-400 mb-1">pedidos</p>
                        </div>
                        <p className="text-xs text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded inline-block mt-1 border border-emerald-500/30">
                          R$ {metricasNexus.comprasValor.toFixed(2).replace('.', ',')} faturados
                        </p>
                      </div>

                    </div>
                  </div>
               </>
            )}

          </div>
        )}

        {/* ABA 1: CAMPANHAS ATIVAS */}
        {abaAtiva === "ativas" && (
          <div className="space-y-6 animate-in slide-in-from-left-2">
            {campanhasAtivas.length === 0 ? (
              <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <Megaphone size={48} className="text-zinc-300 mb-4"/>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Nenhuma campanha ativa</h3>
                <p className="text-zinc-500 text-sm max-w-md mb-6">Você não tem nenhum anúncio rodando no momento. Crie um novo anúncio ou reative um pausado.</p>
                <button onClick={() => setAbaAtiva("criar")} className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <PlusCircle size={18}/> Criar Novo Anúncio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campanhasAtivas.map((campanha) => (
                  <div key={campanha.id} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <h3 className="font-bold text-zinc-900 line-clamp-1">{campanha.nome}</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-2 bg-emerald-50 text-emerald-700">
                          Rodando
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleStatusCampanha(campanha.id, campanha.status)}
                        disabled={processandoStatus === campanha.id}
                        className="p-2 rounded-xl border transition-colors flex items-center justify-center bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        title="Pausar Campanha"
                      >
                        {processandoStatus === campanha.id ? <Loader2 size={20} className="animate-spin"/> : <PauseCircle size={20}/>}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-2 pt-4 border-t border-zinc-100">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><TrendingUp size={12}/> Gasto</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">R$ {campanha.gasto.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><MousePointerClick size={12}/> Cliques</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">{campanha.cliques}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><BarChart3 size={12}/> Custo/Clique</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">R$ {campanha.custoPorClique.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CAMPANHAS PAUSADAS / CONCLUÍDAS */}
        {abaAtiva === "pausadas" && (
          <div className="space-y-6 animate-in slide-in-from-left-2">
            {campanhasPausadas.length === 0 ? (
              <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <Archive size={48} className="text-zinc-300 mb-4"/>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Histórico Limpo</h3>
                <p className="text-zinc-500 text-sm max-w-md">Você não possui campanhas pausadas ou concluídas no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campanhasPausadas.map((campanha) => (
                  <div key={campanha.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden opacity-80 hover:opacity-100">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <h3 className="font-bold text-zinc-900 line-clamp-1">{campanha.nome}</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-2 bg-amber-50 text-amber-700">
                          Pausada
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleStatusCampanha(campanha.id, campanha.status)}
                        disabled={processandoStatus === campanha.id}
                        className="p-2 rounded-xl border transition-colors flex items-center justify-center bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                        title="Reativar Campanha"
                      >
                        {processandoStatus === campanha.id ? <Loader2 size={20} className="animate-spin"/> : <PlayCircle size={20}/>}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-2 pt-4 border-t border-zinc-100">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><TrendingUp size={12}/> Gasto</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">R$ {campanha.gasto.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><MousePointerClick size={12}/> Cliques</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">{campanha.cliques}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><BarChart3 size={12}/> Custo/Clique</p>
                        <p className="font-black text-sm text-zinc-900 mt-0.5">R$ {campanha.custoPorClique.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: CRIAR NOVO ANÚNCIO */}
        {abaAtiva === "criar" && (
          <div className="animate-in slide-in-from-right-2">
            {publicadoSucesso ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center shadow-sm mt-10">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
                <h2 className="text-2xl font-black text-zinc-900 mb-2">Campanha Publicada! 🚀</h2>
                <button onClick={() => { setEtapa(1); setPublicadoSucesso(false); setProdutosSelecionados([]); setCidadeSelecionadaMeta(null); setMidiaUpload(null); setMidiaPreview(null); setMidiaCarrossel({}); setAbaAtiva("ativas"); }} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-xl mt-6 transition-colors">Voltar para o Painel</button>
              </div>
            ) : (
              <>
                {etapa === 1 && (
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <h2 className="font-bold text-lg text-zinc-900">1. Selecione os Produtos para Anunciar</h2>
                        <div className="flex bg-zinc-200/50 p-1 rounded-xl mt-4 max-w-md border border-zinc-200 shadow-inner">
                          <button onClick={() => { setTipoAnuncio('single'); setProdutosSelecionados([]); setMidiaUpload(null); setMidiaCarrossel({}); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex justify-center gap-2 ${tipoAnuncio === 'single' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}><ImagePlay size={16}/> Imagem Única</button>
                          <button onClick={() => { setTipoAnuncio('carousel'); setProdutosSelecionados([]); setMidiaUpload(null); setMidiaCarrossel({}); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex justify-center gap-2 ${tipoAnuncio === 'carousel' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}><Layers size={16}/> Carrossel</button>
                        </div>
                      </div>
                      <div className="relative w-full md:w-72"><Search className="absolute left-3 top-3 text-zinc-400" size={18} /><input type="text" placeholder="Buscar no cardápio..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm" /></div>
                    </div>

                    <div className="p-6 space-y-6">
                      {produtosSelecionados.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl flex flex-col gap-4 animate-in fade-in">
                          <div>
                            <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Film size={20}/> Mídias do Anúncio</h3>
                            <p className="text-sm text-indigo-700 mt-1">Use as fotos padrão do cardápio ou faça upload de imagens e vídeos mais chamativos.</p>
                          </div>

                          {tipoAnuncio === "single" ? (
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="flex-1 w-full">
                                <label className="inline-flex items-center justify-center w-full md:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl cursor-pointer shadow-md transition-colors"><UploadCloud size={20}/> Fazer Upload da Mídia <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" /></label>
                              </div>
                              <div className="w-full md:w-48 aspect-square bg-white rounded-xl border-2 border-indigo-200 border-dashed flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                {midiaType === 'video' && midiaPreview ? <video src={midiaPreview} autoPlay muted loop className="w-full h-full object-cover" /> : midiaPreview ? <img src={midiaPreview} className="w-full h-full object-cover" /> : produtosSelecionados[0].image_url ? <img src={produtosSelecionados[0].image_url} className="w-full h-full object-cover opacity-50" /> : <span className="text-indigo-300 text-xs font-bold text-center">Sem Mídia</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-4 overflow-x-auto pb-2 pt-2 custom-scrollbar">
                              {produtosSelecionados.map(prod => {
                                const custom = midiaCarrossel[prod.id];
                                return (
                                  <div key={prod.id} className="min-w-[140px] w-[140px] bg-white rounded-xl p-3 border border-indigo-100 flex flex-col items-center text-center gap-3 shadow-sm shrink-0">
                                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-100 relative group border border-zinc-200">
                                      {custom?.type === 'video' ? (
                                        <video src={custom.preview} autoPlay muted loop className="w-full h-full object-cover" />
                                      ) : (
                                        <img src={custom?.preview || prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                      )}
                                      <label className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white">
                                        <UploadCloud size={24} className="mb-1" />
                                        <span className="text-[10px] font-bold">Trocar Mídia</span>
                                        <input type="file" accept="image/*,video/*" onChange={(e) => handleMediaCarouselUpload(e, prod.id)} className="hidden" />
                                      </label>
                                    </div>
                                    <p className="text-xs font-bold text-zinc-800 line-clamp-2 leading-tight">{prod.name}</p>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {Object.keys(produtosAgrupados).map(categoria => {
                        const estaAberta = categoriasAbertas[categoria];
                        return (
                          <div key={categoria} className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                            <div onClick={() => toggleCategoriaVisivel(categoria)} className="bg-zinc-50/80 px-6 py-4 flex justify-between cursor-pointer border-b border-zinc-200"><h3 className="font-black text-zinc-800 uppercase text-sm">{categoria} <span className="bg-zinc-200 text-zinc-600 px-2 rounded-full ml-1">{produtosAgrupados[categoria].length}</span></h3><button className="text-zinc-500">{estaAberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></div>
                            {estaAberta && (
                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {produtosAgrupados[categoria].map(prod => (
                                  <div key={prod.id} onClick={() => toggleProduto(prod)} className={`border-2 rounded-xl p-4 cursor-pointer flex gap-3 ${produtosSelecionados.find(p=>p.id===prod.id) ? 'border-indigo-600 bg-indigo-50' : 'border-zinc-200'}`}>
                                    <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden shrink-0"><img src={prod.image_url} className="w-full h-full object-cover" /></div>
                                    <div><h3 className="font-bold text-sm line-clamp-2">{prod.name}</h3><p className="text-indigo-600 font-black text-sm">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center sticky bottom-0 z-10">
                      <span className="font-bold text-zinc-700">{produtosSelecionados.length} selecionados</span>
                      <button onClick={gerarAnuncioIA} disabled={!podeConfigurarCampanha} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"><Wand2 size={18}/> Gerar Anúncio com IA</button>
                    </div>
                  </div>
                )}

                {etapa === 2 && <div className="bg-white rounded-2xl p-12 text-center min-h-[400px] flex flex-col justify-center border border-zinc-200 shadow-sm"><Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40}/><h2 className="text-xl font-bold text-zinc-800">A Inteligência Artificial está montando sua campanha...</h2></div>}

                {etapa === 3 && anuncioGerado && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-8">
                    <div className="lg:col-span-3 space-y-6">

                      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                          <div className="bg-[#1877F2]/5 p-4 border-b border-[#1877F2]/10 flex items-center gap-3">
                            <Facebook className="text-[#1877F2]" size={20}/>
                            <h3 className="font-bold text-[#1877F2]">Ativos Conectados (Meta)</h3>
                            <span className="ml-auto text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Verificado</span>
                          </div>
                          <div className="p-5 grid grid-cols-2 gap-4">
                            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Página de Destino</p>
                              <p className="font-bold text-zinc-800 text-sm truncate">{tenant?.name} (ID: {tenant?.meta_page_id})</p>
                            </div>
                            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Conta de Anúncios</p>
                              <p className="font-bold text-zinc-800 text-sm truncate">ID: {tenant?.meta_ad_account_id}</p>
                            </div>
                          </div>
                      </div>
                      
                      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-black text-zinc-900 flex items-center gap-2"><Target size={20}/> Direcionamento & Orçamento</h2></div>
                        <div className="p-6 space-y-6">
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase"><MapPin size={14} className="inline mr-1"/> Área de Entrega (Cidade)</label>
                            {!cidadeSelecionadaMeta ? (
                              <div className="flex gap-2"><input type="text" value={buscaCidade} onChange={e => setBuscaCidade(e.target.value)} placeholder="Buscar cidade..." className="flex-1 border border-zinc-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none" /><button onClick={buscarCidadeMeta} className="bg-zinc-900 hover:bg-zinc-800 transition-colors text-white px-4 rounded-lg font-bold"><Search size={20} /></button></div>
                            ) : (
                              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between"><div><p className="font-bold text-emerald-800">{cidadeSelecionadaMeta.name}</p><p className="text-xs text-emerald-600">{cidadeSelecionadaMeta.region}</p></div><button onClick={() => setCidadeSelecionadaMeta(null)} className="text-emerald-700 hover:bg-emerald-200 transition-colors font-bold text-xs bg-emerald-100 px-3 py-1.5 rounded-lg">Alterar</button></div>
                            )}
                            {resultadosBuscaCidade.length > 0 && <div className="border border-zinc-200 rounded-xl mt-2 max-h-40 overflow-y-auto">{resultadosBuscaCidade.map(loc => <button key={loc.key} onClick={() => {setCidadeSelecionadaMeta(loc); setBuscaCidade(""); setResultadosBuscaCidade([]);}} className="w-full text-left p-3 hover:bg-zinc-50 border-b border-zinc-100 font-medium text-zinc-700 text-sm">{loc.name}, {loc.region}</button>)}</div>}
                          </div>

                          <div className="flex gap-6">
                            <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase"><DollarSign size={14} className="inline"/> Orçamento Total (R$)</label><input type="number" value={orcamentoTotal} onChange={e => setOrcamentoTotal(Number(e.target.value))} className="w-full border border-zinc-300 p-3 text-xl font-black text-indigo-600 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600" /></div>
                            <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase">Duração (Dias)</label><input type="number" value={diasVeiculacao} onChange={e => setDiasVeiculacao(Number(e.target.value))} className="w-full border border-zinc-300 p-3 text-xl font-black text-zinc-800 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600" /></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-black text-zinc-900 flex items-center gap-2"><Megaphone size={20}/> Texto do Anúncio</h2></div>
                        <div className="p-5 space-y-4">
                          <div><label className="text-xs font-bold text-zinc-500 uppercase">Título Chamativo</label><input type="text" value={anuncioGerado.hook} onChange={e => handleCopyChange("hook", e.target.value)} className="w-full border border-zinc-300 p-3 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm font-medium text-zinc-800" /></div>
                          <div><label className="text-xs font-bold text-zinc-500 uppercase">Texto Principal</label><textarea rows={4} value={anuncioGerado.body} onChange={e => handleCopyChange("body", e.target.value)} className="w-full border border-zinc-300 p-3 rounded-lg resize-none outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm text-zinc-700" /></div>
                        </div>
                      </div>

                    </div>

                    <div className="lg:col-span-2">
                      <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6 sticky top-24 shadow-sm flex flex-col items-center">
                        <h3 className="font-bold text-zinc-800 text-sm mb-4 uppercase tracking-wider self-start">Pré-visualização</h3>
                        
                        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden w-full max-w-[360px] shadow-sm font-sans flex flex-col text-left">
                          
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200">
                                  {tenant?.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover" /> : <span className="font-bold text-zinc-400 text-lg">{tenant?.name?.charAt(0)}</span>}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-zinc-900 leading-none mb-1">{tenant?.name || "Sua Página"}</p>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">Patrocinado <span className="text-[8px]">●</span> 🌎</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-500">
                                <MoreHorizontal size={20} />
                                <X size={20} />
                            </div>
                          </div>

                          <div className="px-3 pb-3 text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
                              {anuncioGerado?.body || "Texto principal do seu anúncio aparecerá aqui."}
                          </div>

                          {tipoAnuncio === "carousel" ? (
                            <div className="flex gap-2 overflow-x-auto pb-4 px-3 snap-x hide-scrollbar">
                              {produtosSelecionados.map((prod, idx) => {
                                  const custom = midiaCarrossel[prod.id];
                                  return (
                                    <div key={idx} className="w-[85%] shrink-0 snap-center border border-zinc-200 rounded-lg overflow-hidden flex flex-col">
                                      <div className="w-full aspect-square bg-zinc-100 border-b border-zinc-100">
                                        {custom?.type === 'video' ? (
                                          <video src={custom.preview} autoPlay muted loop className="w-full h-full object-cover" />
                                        ) : (
                                          <img src={custom?.preview || prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                        )}
                                      </div>
                                      <div className="p-3 bg-zinc-50 flex flex-col gap-3 justify-between flex-1">
                                        <div>
                                          <h4 className="font-bold text-zinc-900 text-sm truncate">{prod.name}</h4>
                                          <p className="text-xs text-zinc-500 truncate mt-0.5">{prod.description || "O sabor que você esperava!"}</p>
                                        </div>
                                        <button className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-[13px] py-1.5 px-4 rounded-md transition-colors w-max">
                                          Pedir agora
                                        </button>
                                      </div>
                                    </div>
                                  )
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col border-y border-zinc-100">
                              <div className="w-full bg-zinc-100 flex items-center justify-center overflow-hidden max-h-[400px]">
                                  {midiaType === 'video' && midiaPreview ? (
                                    <video src={midiaPreview} autoPlay muted loop className="w-full h-auto object-cover" />
                                  ) : (
                                    <img src={midiaPreview || produtosSelecionados[0]?.image_url} className="w-full h-auto object-cover" />
                                  )}
                              </div>
                              <div className="bg-zinc-50 p-3 flex items-center justify-between">
                                  <div className="flex-1 truncate pr-3">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{tenant?.name ? `${tenant.name.replace(/\s+/g, '').toLowerCase()}.com.br` : "SITE.COM"}</p>
                                    <h4 className="font-bold text-zinc-900 text-sm truncate">{anuncioGerado?.hook || produtosSelecionados[0]?.name}</h4>
                                  </div>
                                  <button className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-[13px] py-1.5 px-4 rounded-md transition-colors shrink-0">
                                    Pedir agora
                                  </button>
                              </div>
                            </div>
                          )}

                          <div className="px-3 py-2 flex items-center gap-2 text-zinc-500 text-sm border-b border-zinc-100">
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0"><ThumbsUp size={10} fill="currentColor"/></div>
                              <span className="text-xs font-medium">{(Math.random() * 50 + 10).toFixed(0)}</span>
                          </div>
                          <div className="px-2 py-1 flex justify-between items-center text-zinc-500 font-bold text-[13px]">
                              <button className="flex-1 py-2 flex items-center justify-center gap-1.5 hover:bg-zinc-100 rounded-md transition-colors">
                                <ThumbsUp size={16} /> Curtir
                              </button>
                              <button className="flex-1 py-2 flex items-center justify-center gap-1.5 hover:bg-zinc-100 rounded-md transition-colors">
                                <MessageCircle size={16} /> Comentar
                              </button>
                              <button className="flex-1 py-2 flex items-center justify-center gap-1.5 hover:bg-zinc-100 rounded-md transition-colors">
                                <Share2 size={16} /> Compartilhar
                              </button>
                          </div>
                        </div>

                        <button onClick={publicarNaMeta} disabled={publicando || !cidadeSelecionadaMeta} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl mt-6 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                          {publicando ? "Publicando na Meta..." : "🚀 Publicar Campanha"}
                        </button>
                        <button onClick={() => setEtapa(1)} className="w-full mt-3 text-zinc-500 hover:text-zinc-800 text-sm font-bold transition-colors">
                          Voltar e editar produtos
                        </button>
                        <p className="text-[10px] text-center text-zinc-500 mt-4 leading-tight">Ao publicar, você concorda com as Políticas de Publicidade e os Termos de Serviço da Meta.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}