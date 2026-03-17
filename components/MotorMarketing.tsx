// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Wand2, Target, Megaphone, Loader2, Image as ImageIcon,
  Clock, MapPin, Edit3, DollarSign, Search, Layers, ChevronDown, ChevronUp,
  ImagePlay, Film, UploadCloud, Wallet, ExternalLink, AlertTriangle, CheckCircle2, Plug
} from "lucide-react";

export default function MotorMarketing({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [tipoAnuncio, setTipoAnuncio] = useState<"single" | "carousel">("single");
  const [midiaUpload, setMidiaUpload] = useState<File | null>(null);
  const [midiaPreview, setMidiaPreview] = useState<string | null>(null);
  const [midiaType, setMidiaType] = useState<"image" | "video" | null>(null);
  
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

  useEffect(() => {
    async function carregarDados() {
      const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (tenantData) setTenant(tenantData);

      const { data: prodData } = await supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).order("name");
      if (prodData) setProdutos(prodData);
      
      const { data: integracao } = await supabase.from("tenant_integrations").select("*").eq("tenant_id", tenantId).maybeSingle();
      if (integracao && integracao.facebook_access_token) setAccessToken(integracao.facebook_access_token);
      
      setLoading(false);
    }
    carregarDados();
  }, [tenantId]);

  // VERIFICAÇÃO CRÍTICA DA ARQUITETURA
  const isIntegracaoCompleta = tenant?.meta_page_id && tenant?.meta_ad_account_id && tenant?.meta_pixel_id && accessToken;

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
      } else {
        if (produtosSelecionados.length < 30) setProdutosSelecionados([...produtosSelecionados, prod]);
        else alert("Máximo de 30 produtos.");
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
      setAnuncioGerado({ hook: "Bateu aquela fome? 🤤", body: "Temos os melhores pratos da cidade!", cta: "👉 Clique e peça agora!" });
      setEtapa(3);
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
    if (orcamentoTotal / diasVeiculacao < 10) return alert("A verba diária mínima é R$ 10,00.");
    if (!cidadeSelecionadaMeta) return alert("Selecione uma cidade.");

    setPublicando(true);
    try {
      let uploadedUrl = null;
      if (tipoAnuncio === "single" && midiaUpload) {
        const ext = midiaUpload.name.split('.').pop();
        const fileName = `ads/${tenantId}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('cardapio').upload(fileName, midiaUpload);
        if (error) throw new Error("Erro no upload da mídia.");
        const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      }

      const payload = {
        tenantId, tipoAnuncio, produtos: produtosSelecionados,
        midiaUnicaUrl: uploadedUrl || (tipoAnuncio === "single" ? produtosSelecionados[0].image_url : null),
        midiaType: midiaType || 'image', orcamentoTotal, diasVeiculacao, cidadeMeta: cidadeSelecionadaMeta, 
        anuncioGerado, accessToken,
        adAccountId: tenant.meta_ad_account_id, // PUXA DIRETO DO BANCO
        pageId: tenant.meta_page_id,           // PUXA DIRETO DO BANCO
        pixelId: tenant.meta_pixel_id,         // PUXA DIRETO DO BANCO
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

  const produtosAgrupados = produtos.filter(p => p.name.toLowerCase().includes(buscaProduto.toLowerCase()) || (p.description && p.description.toLowerCase().includes(buscaProduto.toLowerCase())))
    .reduce((acc, prod) => { const catName = prod.categories?.name || "Geral"; if (!acc[catName]) acc[catName] = []; acc[catName].push(prod); return acc; }, {} as Record<string, any[]>);

  const podeConfigurarCampanha = tipoAnuncio === "single" ? produtosSelecionados.length === 1 : produtosSelecionados.length >= 2;

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  // ESTADO VAZIO: LOJISTA AINDA NÃO CONFIGUROU AS INTEGRAÇÕES
  if (!isIntegracaoCompleta) {
    return (
      <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
        <div><h1 className="text-3xl font-black flex items-center gap-3"><span className="bg-indigo-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>Marketing IA</h1></div>
        <div className="bg-white max-w-2xl mx-auto rounded-2xl border border-zinc-200 shadow-sm p-10 text-center mt-10">
          <Plug size={48} className="mx-auto text-zinc-300 mb-6" />
          <h2 className="text-2xl font-black mb-3">Setup Incompleto</h2>
          <p className="text-zinc-500 mb-8">Para usar a Inteligência Artificial, você precisa primeiro conectar seu Facebook e configurar sua Página e Conta de Anúncios.</p>
          <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            Acesse o menu "Integrações" na barra lateral para concluir a configuração.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl"><Wand2 size={24}/></span>Marketing IA</h1>
          <p className="text-zinc-500 mt-1">Crie anúncios automáticos que vendem enquanto você dorme.</p>
        </div>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 flex items-center gap-6">
          <div><p className="text-[10px] font-bold text-zinc-400 uppercase"><Wallet size={12} className="inline mr-1"/> Conta de Anúncios</p><p className="text-sm font-bold text-zinc-800">Faturamento</p></div>
          <button onClick={handleAdicionarSaldoMeta} className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center gap-2"><ExternalLink size={16}/> Saldo (PIX)</button>
        </div>
      </div>

      {publicadoSucesso ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center shadow-sm mt-10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Campanha Lançada! 🚀</h2>
          <button onClick={() => { setEtapa(1); setPublicadoSucesso(false); setProdutosSelecionados([]); setCidadeSelecionadaMeta(null); setMidiaUpload(null); setMidiaPreview(null); }} className="bg-zinc-900 text-white font-bold py-3 px-8 rounded-xl mt-6">Nova Campanha</button>
        </div>
      ) : (
        <>
          {etapa === 1 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <h2 className="font-bold text-lg text-zinc-900">1. O que vamos anunciar hoje?</h2>
                  <div className="flex bg-zinc-200/50 p-1 rounded-xl mt-4 max-w-md border border-zinc-200 shadow-inner">
                    <button onClick={() => { setTipoAnuncio('single'); setProdutosSelecionados([]); setMidiaUpload(null); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex justify-center gap-2 ${tipoAnuncio === 'single' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}><ImagePlay size={16}/> 1 Produto</button>
                    <button onClick={() => { setTipoAnuncio('carousel'); setProdutosSelecionados([]); setMidiaUpload(null); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex justify-center gap-2 ${tipoAnuncio === 'carousel' ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}><Layers size={16}/> Carrossel</button>
                  </div>
                </div>
                <div className="relative w-full md:w-72"><Search className="absolute left-3 top-3 text-zinc-400" size={18} /><input type="text" placeholder="Buscar produto..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm" /></div>
              </div>

              <div className="p-6 space-y-6">
                {tipoAnuncio === "single" && produtosSelecionados.length === 1 && (
                  <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                      <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Film size={20}/> Subir Mídia de Alta Conversão</h3>
                      <p className="text-sm text-indigo-700 mt-1 mb-4">Você pode usar a foto padrão, ou subir um vídeo Reels para chamar mais atenção.</p>
                      <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl cursor-pointer shadow-md"><UploadCloud size={20}/> Carregar Vídeo/Foto <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" /></label>
                    </div>
                    <div className="w-48 aspect-square bg-white rounded-xl border-2 border-indigo-200 border-dashed flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      {midiaType === 'video' && midiaPreview ? <video src={midiaPreview} autoPlay muted loop className="w-full h-full object-cover" /> : midiaPreview ? <img src={midiaPreview} className="w-full h-full object-cover" /> : produtosSelecionados[0].image_url ? <img src={produtosSelecionados[0].image_url} className="w-full h-full object-cover opacity-50" /> : <span className="text-indigo-300 text-xs font-bold text-center">Nenhuma mídia</span>}
                    </div>
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
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center sticky bottom-0">
                <span className="font-bold">{produtosSelecionados.length} selecionados</span>
                <button onClick={gerarAnuncioIA} disabled={!podeConfigurarCampanha} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50">Avançar</button>
              </div>
            </div>
          )}

          {etapa === 2 && <div className="bg-white rounded-2xl p-12 text-center min-h-[400px] flex flex-col justify-center"><Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40}/><h2 className="text-xl font-bold">A inteligência está montando sua campanha...</h2></div>}

          {etapa === 3 && anuncioGerado && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-8">
              <div className="lg:col-span-3 space-y-6">

                {/* CARD DE INTEGRAÇÃO LIMPO (READ-ONLY) */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                  <div className="bg-emerald-100 p-2 rounded-full shrink-0"><CheckCircle2 className="text-emerald-600" size={24}/></div>
                  <div>
                    <h3 className="font-black text-emerald-900 text-lg">Conexão Pronta</h3>
                    <p className="text-emerald-700 text-sm mt-1">Sua página, conta de anúncios e Pixel estão conectados. Os resultados desta campanha irão cair direto no seu painel.</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-black text-zinc-900 flex items-center gap-2"><Target size={20}/> Estratégia de Vendas</h2></div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase"><MapPin size={14} className="inline mr-1"/> Cidade</label>
                      {!cidadeSelecionadaMeta ? (
                        <div className="flex gap-2"><input type="text" value={buscaCidade} onChange={e => setBuscaCidade(e.target.value)} placeholder="Sua cidade..." className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none" /><button onClick={buscarCidadeMeta} className="bg-zinc-900 text-white px-4 rounded-lg font-bold"><Search size={20} /></button></div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between"><div><p className="font-bold text-emerald-800">{cidadeSelecionadaMeta.name}</p><p className="text-xs text-emerald-600">{cidadeSelecionadaMeta.region}</p></div><button onClick={() => setCidadeSelecionadaMeta(null)} className="text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1.5 rounded-lg">Alterar</button></div>
                      )}
                      {resultadosBuscaCidade.length > 0 && <div className="border rounded-xl mt-2 max-h-40 overflow-y-auto">{resultadosBuscaCidade.map(loc => <button key={loc.key} onClick={() => {setCidadeSelecionadaMeta(loc); setBuscaCidade(""); setResultadosBuscaCidade([]);}} className="w-full text-left p-3 hover:bg-zinc-50 border-b">{loc.name}, {loc.region}</button>)}</div>}
                    </div>

                    <div className="flex gap-6">
                      <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase"><DollarSign size={14} className="inline"/> Orçamento Total</label><input type="number" value={orcamentoTotal} onChange={e => setOrcamentoTotal(Number(e.target.value))} className="w-full border p-3 text-xl font-black text-indigo-600 rounded-lg" /></div>
                      <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase">Dias</label><input type="number" value={diasVeiculacao} onChange={e => setDiasVeiculacao(Number(e.target.value))} className="w-full border p-3 text-xl font-black rounded-lg" /></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50"><h2 className="font-bold text-zinc-900 flex items-center gap-2"><Megaphone size={20}/> Textos</h2></div>
                  <div className="p-5 space-y-4">
                    <div><label className="text-xs font-bold text-zinc-400">Gancho</label><input type="text" value={anuncioGerado.hook} onChange={e => handleCopyChange("hook", e.target.value)} className="w-full border p-3 rounded-lg" /></div>
                    <div><label className="text-xs font-bold text-zinc-400">Texto Principal</label><textarea rows={4} value={anuncioGerado.body} onChange={e => handleCopyChange("body", e.target.value)} className="w-full border p-3 rounded-lg resize-none" /></div>
                  </div>
                </div>

              </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-100 rounded-2xl border border-zinc-200 p-6 sticky top-24">
                  <h3 className="font-bold text-zinc-700 text-sm mb-4">Preview</h3>
                  
                  {tipoAnuncio === "carousel" ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                      {produtosSelecionados.map((prod, index) => (
                        <div key={prod.id} className="bg-white min-w-[240px] rounded-xl shadow-md overflow-hidden shrink-0"><div className="w-full aspect-square relative"><img src={prod.image_url} className="w-full h-full object-cover" /></div><div className="p-3"><p className="text-xs font-bold truncate">{prod.name}</p><button className="bg-zinc-100 w-full mt-2 py-1.5 rounded text-xs font-bold">Comprar</button></div></div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white max-w-[320px] mx-auto rounded-xl shadow-md overflow-hidden flex flex-col">
                      <div className="p-3 border-b flex items-center gap-3"><div className="w-8 h-8 bg-zinc-200 rounded-full shrink-0"></div><p className="text-sm font-bold flex-1 truncate">{tenant?.name}</p></div>
                      <div className="p-3 text-sm">{anuncioGerado?.hook}<br/><br/>{anuncioGerado?.body}</div>
                      <div className="w-full aspect-square bg-zinc-950 relative">{midiaType === 'video' && midiaPreview ? <video src={midiaPreview} autoPlay muted loop className="w-full h-full object-contain" /> : <img src={midiaPreview || produtosSelecionados[0]?.image_url} className="w-full h-full object-cover" />}</div>
                      <div className="p-3 flex justify-between items-center border-t"><p className="font-bold text-sm truncate">{produtosSelecionados[0]?.name}</p><button className="bg-zinc-200 text-xs px-3 py-1.5 font-bold rounded">Comprar</button></div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-6"><p className="text-xs text-amber-700 font-medium">Garanta que sua conta possui <strong className="underline cursor-pointer" onClick={handleAdicionarSaldoMeta}>saldo (PIX)</strong>.</p></div>

                  <button onClick={publicarNaMeta} disabled={publicando || !cidadeSelecionadaMeta} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4 disabled:opacity-50">
                    {publicando ? "Publicando..." : "🚀 Publicar Campanha"}
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