// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Wand2, Target, Megaphone, Facebook, 
  CheckCircle2, Loader2, Image as ImageIcon,
  Clock, MapPin, Edit3, DollarSign, Search, Layers, ChevronDown, ChevronUp,
  ImagePlay, Film, UploadCloud, Wallet, ExternalLink, AlertTriangle, Crosshair
} from "lucide-react";

export default function MotorMarketing({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  const [conectandoAuth, setConectandoAuth] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // ==========================================
  // ATIVOS DA META (Páginas, Contas, Pixels)
  // ==========================================
  const [paginasMeta, setPaginasMeta] = useState<any[]>([]);
  const [contasAnuncioMeta, setContasAnuncioMeta] = useState<any[]>([]);
  const [pixelsMeta, setPixelsMeta] = useState<any[]>([]);

  const [paginaSelecionada, setPaginaSelecionada] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [pixelSelecionado, setPixelSelecionado] = useState("");

  // ESTADOS DO PIXELL DA VITRINE (GLOBAL)
  const [contaGlobalSelecionada, setContaGlobalSelecionada] = useState("");
  const [pixelGlobalSelecionado, setPixelGlobalSelecionado] = useState("");
  const [salvandoPixelGlobal, setSalvandoPixelGlobal] = useState(false);
  const [sucessoPixel, setSucessoPixel] = useState(false);

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [tipoAnuncio, setTipoAnuncio] = useState<"single" | "carousel">("single");
  const [midiaUpload, setMidiaUpload] = useState<File | null>(null);
  const [midiaPreview, setMidiaPreview] = useState<string | null>(null);
  const [midiaType, setMidiaType] = useState<"image" | "video" | null>(null);
  
  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem(`@saas_marketing_categorias_${tenantId}`);
      if (salvo) return JSON.parse(salvo);
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

  useEffect(() => {
    async function carregarDados() {
      const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (tenantData) {
        setTenant(tenantData);
        if (tenantData.meta_pixel_id) setPixelGlobalSelecionado(tenantData.meta_pixel_id);
      }

      const { data: prodData } = await supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).order("name");
      if (prodData) setProdutos(prodData);
      
      const { data: integracao } = await supabase.from("tenant_integrations").select("*").eq("tenant_id", tenantId).maybeSingle();
      
      if (integracao && integracao.facebook_access_token) {
        setIsFacebookConnected(true);
        setAccessToken(integracao.facebook_access_token);
        buscarAtivosIniciais(integracao.facebook_access_token);
      } else {
        setIsFacebookConnected(false);
      }
      setLoading(false);
    }
    carregarDados();
  }, [tenantId]);

  const buscarAtivosIniciais = async (token: string) => {
    try {
      const paginasRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name&limit=100&access_token=${token}`);
      const paginasData = await paginasRes.json();
      if (paginasData.data) setPaginasMeta(paginasData.data);

      const contasRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&limit=100&access_token=${token}`);
      const contasData = await contasRes.json();
      if (contasData.data) setContasAnuncioMeta(contasData.data);
    } catch (error) {
      console.error("Erro ao buscar ativos iniciais da Meta:", error);
    }
  };

  // Carrega pixels para a Criação de Anúncio
  useEffect(() => {
    if (contaSelecionada && accessToken) {
      const buscarPixels = async () => {
        try {
          const res = await fetch(`https://graph.facebook.com/v19.0/${contaSelecionada}/adspixels?fields=id,name&limit=100&access_token=${accessToken}`);
          const data = await res.json();
          if (data.data) setPixelsMeta(data.data);
        } catch (error) {}
      };
      buscarPixels();
    }
  }, [contaSelecionada, accessToken]);

  // Carrega pixels para a Configuração GLOBAL da Vitrine
  const carregarPixelsGlobais = async (accountId: string) => {
    setContaGlobalSelecionada(accountId);
    if (!accountId || !accessToken) return;
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/adspixels?fields=id,name&limit=100&access_token=${accessToken}`);
      const data = await res.json();
      if (data.data) setPixelsMeta(data.data); // Reusa o mesmo estado de pixels
    } catch (error) {}
  };

  const salvarPixelGlobal = async () => {
    if (!pixelGlobalSelecionado) return alert("Selecione um pixel primeiro!");
    setSalvandoPixelGlobal(true);
    const { error } = await supabase.from("tenants").update({ meta_pixel_id: pixelGlobalSelecionado }).eq("id", tenantId);
    setSalvandoPixelGlobal(false);
    
    if (error) {
      alert("Erro ao salvar Pixel.");
    } else {
      setSucessoPixel(true);
      setTimeout(() => setSucessoPixel(false), 3000);
    }
  };

  const handleConectarFacebook = () => {
    setConectandoAuth(true);
    const appId = "4223060334506886"; 
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/callback`);
    const scope = "ads_management,pages_manage_ads,pages_read_engagement,business_management";
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${tenantId}&scope=${scope}`;
  };

  const handleAdicionarSaldoMeta = () => {
    const contaUsada = contaSelecionada || contaGlobalSelecionada;
    if (!contaUsada) {
      alert("Por favor, selecione primeiro a sua Conta de Anúncios!");
      return;
    }
    const actId = contaUsada.replace("act_", "");
    const linkFaturamento = `https://business.facebook.com/billing_hub/accounts/details?asset_id=${actId}`;
    window.open(linkFaturamento, "_blank");
  };

  const toggleProduto = (prod: any) => {
    if (tipoAnuncio === "single") {
      if (produtosSelecionados.find(p => p.id === prod.id)) {
        setProdutosSelecionados([]);
        setMidiaUpload(null); setMidiaPreview(null); setMidiaType(null);
      } else {
        setProdutosSelecionados([prod]);
      }
    } else {
      if (produtosSelecionados.find(p => p.id === prod.id)) {
        setProdutosSelecionados(produtosSelecionados.filter(p => p.id !== prod.id));
      } else {
        if (produtosSelecionados.length < 30) setProdutosSelecionados([...produtosSelecionados, prod]);
        else alert("Selecione no máximo 30 produtos para o carrossel.");
      }
    }
  };

  const toggleCategoriaVisivel = (categoriaNome: string) => {
    setCategoriasAbertas(prev => {
      const novoEstado = { ...prev, [categoriaNome]: !prev[categoriaNome] };
      localStorage.setItem(`@saas_marketing_categorias_${tenantId}`, JSON.stringify(novoEstado));
      return novoEstado;
    });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMidiaUpload(file);
    setMidiaPreview(URL.createObjectURL(file));
    setMidiaType(file.type.startsWith('video/') ? 'video' : 'image');
  };

  const gerarAnuncioIA = async () => {
    setEtapa(2); 
    try {
      const res = await fetch('/api/ai/gerar-anuncio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos: produtosSelecionados, tenantName: tenant?.name || "Nosso Restaurante", tipoAnuncio })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAnuncioGerado({ hook: data.hook, body: data.body, cta: data.cta });
      setEtapa(3); 
    } catch (error: any) {
      setAnuncioGerado({
        hook: "Bateu aquela fome inexplicável? 🤤",
        body: "Não passe vontade! Preparamos os melhores produtos da cidade, feitos com ingredientes selecionados e entregues quentinhos na sua porta.",
        cta: "👉 Clique abaixo e faça o seu pedido agora!"
      });
      setEtapa(3);
    }
  };

  const handleCopyChange = (field: "hook" | "body" | "cta", value: string) => {
    if (anuncioGerado) setAnuncioGerado({ ...anuncioGerado, [field]: value });
  };

  const handleTrocarFotoProduto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const novosProdutos = [...produtosSelecionados];
    novosProdutos[index] = { ...novosProdutos[index], image_url: URL.createObjectURL(file) };
    setProdutosSelecionados(novosProdutos);
  };

  const buscarCidadeMeta = async () => {
    if (!buscaCidade.trim() || buscaCidade.length < 3) return;
    setBuscandoCidades(true);
    setResultadosBuscaCidade([]);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/search?type=adgeolocation&q=${encodeURIComponent(buscaCidade)}&access_token=${accessToken}`);
      const data = await res.json();
      if (data.data) setResultadosBuscaCidade(data.data.filter((loc: any) => loc.type === 'city'));
    } catch (error) {} finally { setBuscandoCidades(false); }
  };

  const publicarNaMeta = async () => {
    if (orcamentoTotal / diasVeiculacao < 10) return alert("A verba diária deve ser de pelo menos R$ 10,00.");
    if (!cidadeSelecionadaMeta) return alert("Selecione uma cidade.");
    if (!paginaSelecionada || !contaSelecionada || !pixelSelecionado) return alert("Selecione a Página, Conta de Anúncios e Pixel da Meta.");

    setPublicando(true);

    try {
      let uploadedUrl = null;
      if (tipoAnuncio === "single" && midiaUpload) {
        const ext = midiaUpload.name.split('.').pop();
        const fileName = `ads/${tenantId}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('cardapio').upload(fileName, midiaUpload);
        if (error) throw new Error("Erro ao fazer upload da mídia. Tente novamente.");
        const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      }

      const payload = {
        tenantId: tenantId,
        tipoAnuncio: tipoAnuncio,
        produtos: produtosSelecionados,
        midiaUnicaUrl: uploadedUrl || (tipoAnuncio === "single" ? produtosSelecionados[0].image_url : null),
        midiaType: midiaType || 'image',
        orcamentoTotal: orcamentoTotal,
        diasVeiculacao: diasVeiculacao,
        cidadeMeta: cidadeSelecionadaMeta, 
        anuncioGerado: anuncioGerado,
        accessToken: accessToken,
        adAccountId: contaSelecionada,
        pageId: paginaSelecionada,
        pixelId: pixelSelecionado,
        horarioInicio: horarioInicio,
        horarioFim: horarioFim
      };

      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPublicadoSucesso(true);
    } catch (error: any) {
      alert(`Erro ao publicar na Meta: ${error.message}`);
    } finally {
      setPublicando(false);
    }
  };

  const produtosFiltrados = produtos.filter(p => 
    p.name.toLowerCase().includes(buscaProduto.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(buscaProduto.toLowerCase()))
  );

  const produtosAgrupados = produtosFiltrados.reduce((acc, prod) => {
    const catName = prod.categories?.name || "Geral";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(prod);
    return acc;
  }, {} as Record<string, any[]>);

  const podeConfigurarCampanha = tipoAnuncio === "single" ? produtosSelecionados.length === 1 : produtosSelecionados.length >= 2;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-zinc-500 font-bold">Carregando seus produtos e conexões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
      
      {/* HEADER DA TELA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>
            Marketing IA
          </h1>
          <p className="text-zinc-500 mt-1">Crie anúncios automáticos que vendem enquanto você dorme.</p>
        </div>

        {isFacebookConnected && accessToken && (
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 flex items-center gap-6 w-full md:w-auto">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet size={12}/> Conta de Anúncios</p>
              <p className="text-sm font-bold text-zinc-800">
                Gerenciar Faturamento
              </p>
            </div>
            <button 
              onClick={handleAdicionarSaldoMeta}
              className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center gap-2 whitespace-nowrap shadow-md shadow-blue-500/20"
            >
              Adicionar Saldo (PIX) <ExternalLink size={16}/>
            </button>
          </div>
        )}
      </div>

      {/* BLOCO DE CONEXÃO COM O FACEBOOK */}
      {!isFacebookConnected && !accessToken ? (
        <div className="bg-white max-w-3xl mx-auto rounded-2xl border border-zinc-200 shadow-sm p-10 text-center animate-in zoom-in-95 mt-10">
          <Facebook size={48} className="mx-auto text-[#1877F2] mb-6" />
          <h2 className="text-2xl font-black mb-4">Conecte sua conta da Meta</h2>
          <p className="text-zinc-500 mb-8 text-lg">Para a nossa Inteligência Artificial criar os anúncios, precisamos da sua permissão para gerenciar a página.</p>
          <button onClick={handleConectarFacebook} disabled={conectandoAuth} className="bg-[#1877F2] hover:bg-[#166fe5] transition text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 disabled:opacity-70">
            {conectandoAuth ? "Autorizando com a Meta..." : "Conectar com Facebook"}
          </button>
        </div>
      ) : publicadoSucesso ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center animate-in zoom-in-95 shadow-sm mt-10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Campanha Lançada! 🚀</h2>
          <p className="text-zinc-500 max-w-md mx-auto mb-8">O seu anúncio já está no Gerenciador da Meta pronto para vender.</p>
          <button onClick={() => { setEtapa(1); setPublicadoSucesso(false); setProdutosSelecionados([]); setCidadeSelecionadaMeta(null); setMidiaUpload(null); setMidiaPreview(null); }} className="bg-zinc-900 text-white font-bold py-3 px-8 rounded-xl transition-colors">Criar Nova Campanha</button>
        </div>
      ) : (
        <>
          {/* NOVA SEÇÃO: CONFIGURAÇÃO GLOBAL DO PIXEL (Apenas visível na Etapa 1 para não poluir) */}
          {etapa === 1 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Crosshair size={20}/> Rastreamento da Vitrine (Pixel)</h3>
                <p className="text-sm text-indigo-700 mt-1">Selecione o Pixel que ficará ativo na sua loja para rastrear visitas, carrinhos e compras. A nossa Inteligência vai otimizar seus anúncios baseada nesses dados.</p>
              </div>
              <div className="w-full md:w-auto flex flex-col gap-3 min-w-[300px]">
                <select 
                  value={contaGlobalSelecionada} 
                  onChange={e => carregarPixelsGlobais(e.target.value)} 
                  className="w-full border border-indigo-200 rounded-lg p-2.5 text-sm font-bold text-indigo-900 bg-white outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">1º. Selecione a Conta de Anúncio...</option>
                  {contasAnuncioMeta.map(conta => <option key={conta.id} value={conta.id}>{conta.name}</option>)}
                </select>

                <div className="flex gap-2">
                  <select 
                    value={pixelGlobalSelecionado} 
                    onChange={e => setPixelGlobalSelecionado(e.target.value)} 
                    disabled={!contaGlobalSelecionada || pixelsMeta.length === 0}
                    className="flex-1 border border-indigo-200 rounded-lg p-2.5 text-sm font-bold text-indigo-900 bg-white outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"
                  >
                    <option value="">2º. Escolha o Pixel...</option>
                    {pixelsMeta.map(pixel => <option key={pixel.id} value={pixel.id}>{pixel.name} (Ativo)</option>)}
                  </select>
                  
                  <button 
                    onClick={salvarPixelGlobal}
                    disabled={!pixelGlobalSelecionado || salvandoPixelGlobal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 shadow-sm"
                  >
                    {salvandoPixelGlobal ? <Loader2 size={16} className="animate-spin"/> : sucessoPixel ? <CheckCircle2 size={16}/> : "Salvar"}
                  </button>
                </div>
                {sucessoPixel && <span className="text-xs font-bold text-emerald-600 text-right">Pixel instalado na vitrine! ✅</span>}
                {tenant?.meta_pixel_id && !sucessoPixel && <span className="text-xs font-bold text-indigo-600 text-right">Pixel atual: {tenant.meta_pixel_id}</span>}
              </div>
            </div>
          )}

          {/* O RESTO DO COMPONENTE CONTINUA IGUAL */}
          {etapa === 1 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex-1">
                  <h2 className="font-bold text-lg text-zinc-900">1. O que vamos anunciar hoje?</h2>
                  
                  <div className="flex bg-zinc-200/50 p-1 rounded-xl mt-4 max-w-md border border-zinc-200 shadow-inner">
                    <button 
                      onClick={() => { setTipoAnuncio('single'); setProdutosSelecionados([]); setMidiaUpload(null); setMidiaPreview(null); }} 
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex justify-center items-center gap-2 ${tipoAnuncio === 'single' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <ImagePlay size={16}/> 1 Produto (Vídeo/Foto)
                    </button>
                    <button 
                      onClick={() => { setTipoAnuncio('carousel'); setProdutosSelecionados([]); setMidiaUpload(null); setMidiaPreview(null); }} 
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex justify-center items-center gap-2 ${tipoAnuncio === 'carousel' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <Layers size={16}/> Carrossel (Até 30)
                    </button>
                  </div>
                </div>
                
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-3 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar produto..." 
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm text-sm"
                  />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {tipoAnuncio === "single" && produtosSelecionados.length === 1 && (
                  <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl animate-in slide-in-from-top-4 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                      <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Film size={20}/> Subir Mídia de Alta Conversão</h3>
                      <p className="text-sm text-indigo-700 mt-1 mb-4">Por padrão, usaremos a foto do cardápio do <strong>{produtosSelecionados[0].name}</strong>. Mas se você tiver um vídeo Reels ou arte, suba aqui! Vídeos chamam 3x mais atenção.</p>
                      
                      <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl cursor-pointer transition-colors shadow-md">
                        <UploadCloud size={20}/>
                        Carregar Vídeo ou Foto
                        <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
                      </label>
                    </div>
                    
                    <div className="w-full md:w-48 aspect-square bg-white rounded-xl border-2 border-indigo-200 border-dashed overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                      {midiaType === 'video' && midiaPreview ? (
                        <video src={midiaPreview} autoPlay muted loop className="w-full h-full object-cover" />
                      ) : midiaPreview ? (
                        <img src={midiaPreview} className="w-full h-full object-cover" />
                      ) : produtosSelecionados[0].image_url ? (
                        <img src={produtosSelecionados[0].image_url} className="w-full h-full object-cover opacity-50" />
                      ) : (
                        <span className="text-indigo-300 text-xs font-bold text-center p-4">Nenhuma mídia customizada</span>
                      )}
                    </div>
                  </div>
                )}

                {Object.keys(produtosAgrupados).length === 0 ? (
                  <p className="text-center py-10 text-zinc-500">Nenhum produto encontrado.</p>
                ) : (
                  Object.keys(produtosAgrupados).sort().map(categoria => {
                    const estaAberta = categoriasAbertas[categoria];
                    
                    return (
                      <div key={categoria} className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm transition-all">
                        <div 
                          onClick={() => toggleCategoriaVisivel(categoria)}
                          className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200 flex justify-between items-center cursor-pointer hover:bg-zinc-100 transition-colors"
                        >
                          <h3 className="font-black text-zinc-800 uppercase tracking-wider text-sm flex items-center gap-2">
                            {categoria} <span className="bg-zinc-200 text-zinc-600 text-[10px] px-2 py-0.5 rounded-full">{produtosAgrupados[categoria].length}</span>
                          </h3>
                          <button className="text-zinc-500">
                            {estaAberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </div>

                        {estaAberta && (
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                            {produtosAgrupados[categoria].map(prod => {
                              const selecionado = produtosSelecionados.find(p => p.id === prod.id);
                              return (
                                <div key={prod.id} onClick={() => toggleProduto(prod)} className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex gap-3 ${selecionado ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.02]' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                  <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
                                    {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={24}/></div>}
                                  </div>
                                  <div className="flex flex-col justify-center flex-1">
                                    <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1 text-zinc-900">{prod.name}</h3>
                                    <p className="text-indigo-600 font-black text-sm">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>
                                  </div>
                                  {selecionado && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1"><CheckCircle2 size={12}/></div>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="font-bold">{produtosSelecionados.length} {tipoAnuncio === "single" ? "selecionado (1 máx)" : "selecionados"}</div>
                <button onClick={gerarAnuncioIA} disabled={!podeConfigurarCampanha} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                  Avançar e Configurar Anúncio
                </button>
              </div>
            </div>
          )}

          {etapa === 2 && (
            <div className="bg-white rounded-2xl p-12 text-center min-h-[400px] flex flex-col items-center justify-center"><Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/><h2 className="text-xl font-bold">A inteligência está montando sua campanha...</h2></div>
          )}

          {etapa === 3 && anuncioGerado && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-8">
              <div className="lg:col-span-3 space-y-6">

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden border-t-4 border-t-blue-600">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50">
                    <h2 className="font-black text-zinc-900 flex items-center gap-2"><Layers size={20}/> Conexões do Facebook</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Página do Facebook</label>
                        <select value={paginaSelecionada} onChange={e => setPaginaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                          <option value="">Selecione uma Página...</option>
                          {paginasMeta.map(pag => <option key={pag.id} value={pag.id}>{pag.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Conta de Anúncios</label>
                        <select value={contaSelecionada} onChange={e => setContaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                          <option value="">Selecione uma Conta...</option>
                          {contasAnuncioMeta.map(conta => <option key={conta.id} value={conta.id}>{conta.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {contaSelecionada && (
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Pixel de Rastreamento</label>
                        <select value={pixelSelecionado} onChange={e => setPixelSelecionado(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                          <option value="">Selecione um Pixel...</option>
                          {pixelsMeta.length === 0 ? (
                            <option disabled>Nenhum pixel encontrado nesta conta.</option>
                          ) : (
                            pixelsMeta.map(pixel => <option key={pixel.id} value={pixel.id}>{pixel.name}</option>)
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden border-t-4 border-t-indigo-600">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-black text-zinc-900 flex items-center gap-2"><Target size={20}/> Estratégia de Vendas</h2></div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><MapPin size={14}/> Cidade de Veiculação</label>
                      {!cidadeSelecionadaMeta ? (
                        <div className="relative">
                          <div className="flex gap-2">
                            <input type="text" value={buscaCidade} onChange={(e) => setBuscaCidade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarCidadeMeta()} placeholder="Digite o nome da cidade..." className="flex-1 border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" />
                            <button onClick={buscarCidadeMeta} disabled={buscandoCidades || buscaCidade.length < 3} className="bg-zinc-900 text-white px-4 rounded-lg font-bold flex items-center justify-center disabled:opacity-50">{buscandoCidades ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}</button>
                          </div>
                          {resultadosBuscaCidade.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                              {resultadosBuscaCidade.map((loc) => (
                                <button key={loc.key} onClick={() => {setCidadeSelecionadaMeta(loc); setBuscaCidade(""); setResultadosBuscaCidade([]);}} className="w-full text-left p-4 hover:bg-zinc-50 border-b border-zinc-100 transition-colors">
                                  <p className="font-bold text-zinc-900">{loc.name}</p><p className="text-xs text-zinc-500">{loc.region}, {loc.country_name}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                          <div><p className="font-bold text-emerald-800">{cidadeSelecionadaMeta.name}</p><p className="text-xs text-emerald-600">{cidadeSelecionadaMeta.region}, {cidadeSelecionadaMeta.country_name}</p></div>
                          <button onClick={() => setCidadeSelecionadaMeta(null)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs bg-emerald-100 px-3 py-1.5 rounded-lg">Alterar</button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><Clock size={14}/> Horário de Exibição</label>
                        <div className="flex items-center gap-2">
                          <input type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="flex-1 border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" />
                          <span className="text-zinc-400 font-bold">às</span>
                          <input type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} className="flex-1 border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase"><DollarSign size={14} className="inline"/> Orçamento Total</label>
                          <input type="number" min="0" value={orcamentoTotal} onChange={(e) => setOrcamentoTotal(Number(e.target.value))} className="w-full border border-zinc-300 rounded-lg p-3 text-xl font-black text-indigo-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Dias</label>
                          <input type="number" min="1" value={diasVeiculacao} onChange={(e) => setDiasVeiculacao(Number(e.target.value))} className="w-full border border-zinc-300 rounded-lg p-3 text-xl font-black text-zinc-900" />
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Precisa de saldo para rodar a campanha?</p>
                        <p className="text-xs text-zinc-500">Adicione fundos via PIX diretamente no painel da Meta.</p>
                      </div>
                      <button 
                        onClick={handleAdicionarSaldoMeta}
                        disabled={!contaSelecionada}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center gap-2 whitespace-nowrap border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Wallet size={16}/> Adicionar Saldo na Meta <ExternalLink size={14}/>
                      </button>
                    </div>

                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-bold text-zinc-900 flex items-center gap-2"><Megaphone size={20}/> Textos</h2></div>
                  <div className="p-5 space-y-5">
                    <div><label className="text-xs font-bold text-zinc-400">HOOK (O Gancho)</label><input type="text" value={anuncioGerado.hook} onChange={e => handleCopyChange("hook", e.target.value)} className="w-full border p-3 rounded-lg" /></div>
                    <div><label className="text-xs font-bold text-zinc-400">CORPO</label><textarea rows={4} value={anuncioGerado.body} onChange={e => handleCopyChange("body", e.target.value)} className="w-full border p-3 rounded-lg resize-none" /></div>
                  </div>
                </div>

              </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-100 rounded-2xl border border-zinc-200 p-6 sticky top-24">
                  <h3 className="font-bold text-zinc-700 text-sm mb-4">Preview do Anúncio</h3>
                  
                  {tipoAnuncio === "carousel" ? (
                    <div className="w-full flex gap-4 overflow-x-auto pb-4 snap-x">
                      {produtosSelecionados.map((prod, index) => (
                        <div key={prod.id} className="bg-white min-w-[240px] max-w-[240px] rounded-xl shadow-lg border border-zinc-200 overflow-hidden snap-center flex-shrink-0">
                          <div className="w-full aspect-square bg-zinc-100 relative group">
                            {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={48} /></div>}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-2"><Edit3 size={24} /> Trocar Capa<input type="file" accept="image/*" className="hidden" onChange={(e) => handleTrocarFotoProduto(index, e)} /></label>
                          </div>
                          <div className="p-3"><p className="text-xs font-bold line-clamp-1 mb-2">{prod.name}</p><button className="bg-zinc-100 text-zinc-600 font-bold text-xs px-4 py-2 w-full rounded-md border border-zinc-200">Ver Cardápio</button></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white max-w-[320px] mx-auto rounded-xl shadow-lg border border-zinc-200 overflow-hidden flex-shrink-0 flex flex-col">
                      <div className="p-3 flex items-center gap-3 border-b border-zinc-100">
                        <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-500 text-sm overflow-hidden shrink-0 border border-zinc-200">
                          {tenant?.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover"/> : tenant?.name.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-zinc-900 leading-tight truncate">{tenant?.name}</p>
                          <p className="text-[11px] text-zinc-500">Patrocinado • 🌎</p>
                        </div>
                      </div>
                      <div className="p-3 text-sm text-zinc-800 whitespace-pre-line leading-snug">
                        <span className="font-bold">{anuncioGerado?.hook}</span><br/><br/>{anuncioGerado?.body}
                      </div>
                      <div className="w-full aspect-square bg-zinc-950 relative flex items-center justify-center">
                        {midiaType === 'video' && midiaPreview ? (
                          <video src={midiaPreview} autoPlay muted loop playsInline className="w-full h-full object-contain" />
                        ) : (
                          <img src={midiaPreview || produtosSelecionados[0]?.image_url} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="bg-zinc-50 p-3 flex justify-between items-center border-t border-zinc-200">
                        <div className="flex-1 pr-2">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Fazer Pedido Agora</p>
                          <p className="font-bold text-sm text-zinc-900 leading-tight truncate">{produtosSelecionados[0]?.name}</p>
                        </div>
                        <button className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs px-4 py-2 rounded-lg transition-colors shrink-0">Comprar</button>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={publicarNaMeta} 
                    disabled={publicando || (orcamentoTotal/diasVeiculacao < 10) || !cidadeSelecionadaMeta || !paginaSelecionada || !contaSelecionada || !pixelSelecionado} 
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-6 disabled:opacity-50 transition-opacity flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {publicando ? <><Loader2 size={20} className="animate-spin"/> Publicando no Gerenciador...</> : "🚀 Publicar Campanha na Meta"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}