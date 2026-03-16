// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Wand2, Target, Megaphone, Facebook, 
  CheckCircle2, Loader2, Image as ImageIcon,
  Clock, MapPin, Edit3, DollarSign, Search, Layers
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

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  
  // NOVO: Busca de produtos
  const [buscaProduto, setBuscaProduto] = useState("");
  
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
      if (tenantData) setTenant(tenantData);

      // ATUALIZADO: Agora puxa o nome da categoria junto com o produto
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

  useEffect(() => {
    if (contaSelecionada && accessToken) {
      const buscarPixels = async () => {
        try {
          const res = await fetch(`https://graph.facebook.com/v19.0/${contaSelecionada}/adspixels?fields=id,name&limit=100&access_token=${accessToken}`);
          const data = await res.json();
          if (data.data) setPixelsMeta(data.data);
        } catch (error) {
          console.error("Erro ao buscar pixels:", error);
        }
      };
      buscarPixels();
    }
  }, [contaSelecionada, accessToken]);

  const handleConectarFacebook = () => {
    setConectandoAuth(true);
    const appId = "4223060334506886"; // MANTENHA O SEU ID AQUI
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/callback`);
    const scope = "ads_management,pages_manage_ads,pages_read_engagement,business_management";
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${tenantId}&scope=${scope}`;
  };

  const toggleProduto = (prod: any) => {
    if (produtosSelecionados.find(p => p.id === prod.id)) {
      setProdutosSelecionados(produtosSelecionados.filter(p => p.id !== prod.id));
    } else {
      if (produtosSelecionados.length < 5) setProdutosSelecionados([...produtosSelecionados, prod]);
      else alert("Selecione no máximo 5 produtos para o carrossel.");
    }
  };

  const gerarAnuncioIA = async () => {
    if (produtosSelecionados.length < 2) return alert("Selecione ao menos 2 produtos.");
    setEtapa(2); 
    try {
      const res = await fetch('/api/ai/gerar-anuncio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos: produtosSelecionados, tenantName: tenant?.name || "Nosso Restaurante" })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAnuncioGerado({ hook: data.hook, body: data.body, cta: data.cta });
      setEtapa(3); 
    } catch (error: any) {
      setAnuncioGerado({
        hook: "Bateu aquela fome inexplicável? 🤤",
        body: "Não passe vontade! Preparamos os melhores pratos da cidade, feitos com ingredientes selecionados e entregues quentinhos na sua porta.",
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
      const payload = {
        tenantId: tenantId,
        produtos: produtosSelecionados,
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

  // ==========================================
  // AGRUPAMENTO DE PRODUTOS PARA A TELA
  // ==========================================
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


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-zinc-500 font-bold">Verificando conexões...</p>
      </div>
    );
  }

  if (!isFacebookConnected && !accessToken) {
    return (
      <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>Marketing IA</h1></div>
        </div>
        <div className="bg-white max-w-3xl mx-auto rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <Facebook size={40} className="mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold mb-6">Conecte sua conta da Meta</h2>
            <p className="text-zinc-500 mb-8">Para criarmos os seus anúncios automaticamente, precisamos da sua permissão.</p>
            <button onClick={handleConectarFacebook} className="bg-[#1877F2] hover:bg-[#166fe5] transition text-white px-8 py-3 rounded-xl font-bold">
              {conectandoAuth ? "Conectando..." : "Conectar Facebook"}
            </button>
        </div>
      </div>
    );
  }
  
  if (publicadoSucesso) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center animate-in zoom-in-95 shadow-sm">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
        <h2 className="text-2xl font-black text-zinc-900 mb-2">Campanha de Conversão no Ar! 🚀</h2>
        <p className="text-zinc-500 max-w-md mx-auto mb-8">O seu anúncio já está no Gerenciador da Meta pronto para vender.</p>
        <button onClick={() => { setEtapa(1); setPublicadoSucesso(false); setProdutosSelecionados([]); setCidadeSelecionadaMeta(null); }} className="bg-zinc-900 text-white font-bold py-3 px-8 rounded-xl transition-colors">Nova Campanha</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>Marketing IA</h1></div>
      </div>

      {etapa === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg text-zinc-900">1. O que vamos anunciar hoje?</h2>
              <p className="text-sm text-zinc-500">Selecione de 2 a 5 produtos para criar um anúncio em Carrossel.</p>
            </div>
            
            {/* NOVA BARRA DE BUSCA */}
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

          <div className="p-6">
            {Object.keys(produtosAgrupados).length === 0 ? (
               <p className="text-center py-10 text-zinc-500">Nenhum produto encontrado.</p>
            ) : (
              Object.keys(produtosAgrupados).sort().map(categoria => (
                <div key={categoria} className="mb-8 last:mb-0">
                  {/* TÍTULO DA CATEGORIA */}
                  <h3 className="font-black text-zinc-800 uppercase tracking-wider text-sm mb-4 border-b border-zinc-100 pb-2">
                    {categoria} <span className="text-zinc-400 text-[10px] ml-1">({produtosAgrupados[categoria].length})</span>
                  </h3>
                  
                  {/* GRID DE PRODUTOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {produtosAgrupados[categoria].map(prod => {
                      const selecionado = produtosSelecionados.find(p => p.id === prod.id);
                      return (
                        <div key={prod.id} onClick={() => toggleProduto(prod)} className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex gap-3 ${selecionado ? 'border-purple-600 bg-purple-50/30' : 'border-zinc-200 hover:border-zinc-300'}`}>
                          <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
                            {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={24}/></div>}
                          </div>
                          <div className="flex flex-col justify-center flex-1">
                            <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1">{prod.name}</h3>
                            <p className="text-purple-700 font-black text-sm">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between sticky bottom-0">
            <div className="font-bold">{produtosSelecionados.length} selecionados</div>
            <button onClick={gerarAnuncioIA} disabled={produtosSelecionados.length < 2} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">Configurar Campanha</button>
          </div>
        </div>
      )}

      {etapa === 2 && (
        <div className="bg-white rounded-2xl p-12 text-center min-h-[400px] flex flex-col items-center justify-center"><Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/><h2 className="text-xl font-bold">A preparar máquina de vendas...</h2></div>
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
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-bold text-zinc-900 flex items-center gap-2"><Megaphone size={20}/> Textos</h2></div>
              <div className="p-5 space-y-5">
                <div><label className="text-xs font-bold text-zinc-400">HOOK</label><input type="text" value={anuncioGerado.hook} onChange={e => handleCopyChange("hook", e.target.value)} className="w-full border p-3 rounded-lg" /></div>
                <div><label className="text-xs font-bold text-zinc-400">CORPO</label><textarea rows={4} value={anuncioGerado.body} onChange={e => handleCopyChange("body", e.target.value)} className="w-full border p-3 rounded-lg resize-none" /></div>
              </div>
            </div>

          </div>

          <div className="lg:col-span-2">
            <div className="bg-zinc-100 rounded-2xl border border-zinc-200 p-6 sticky top-24">
              <h3 className="font-bold text-zinc-700 text-sm mb-4">Preview</h3>
              <div className="w-full flex gap-4 overflow-x-auto pb-4 snap-x">
                {produtosSelecionados.map((prod, index) => (
                  <div key={prod.id} className="bg-white min-w-[240px] max-w-[240px] rounded-xl shadow-lg border border-zinc-200 overflow-hidden snap-center flex-shrink-0">
                    <div className="w-full aspect-square bg-zinc-100 relative group">
                      {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={48} /></div>}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-2"><Edit3 size={24} /> Trocar<input type="file" accept="image/*" className="hidden" onChange={(e) => handleTrocarFotoProduto(index, e)} /></label>
                    </div>
                    <div className="p-3"><p className="text-xs font-bold line-clamp-1 mb-2">{prod.name}</p><button className="bg-blue-50 text-blue-600 font-bold text-xs px-4 py-2 w-full rounded-md">Comprar Agora</button></div>
                  </div>
                ))}
              </div>
              <button 
                onClick={publicarNaMeta} 
                disabled={publicando || (orcamentoTotal/diasVeiculacao < 10) || !cidadeSelecionadaMeta || !paginaSelecionada || !contaSelecionada || !pixelSelecionado} 
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4 disabled:opacity-50 transition-opacity"
              >
                {publicando ? "Publicando..." : "Publicar Campanha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}