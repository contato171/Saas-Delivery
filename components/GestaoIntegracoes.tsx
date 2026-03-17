// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { Plug, Facebook, CheckCircle2, Loader2, Save, AlertCircle } from "lucide-react";

export default function GestaoIntegracoes({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [conectandoAuth, setConectandoAuth] = useState(false);

  // Ativos da Meta
  const [paginasMeta, setPaginasMeta] = useState<any[]>([]);
  const [contasAnuncioMeta, setContasAnuncioMeta] = useState<any[]>([]);
  const [pixelsMeta, setPixelsMeta] = useState<any[]>([]);

  // Seleções do Lojista
  const [paginaSelecionada, setPaginaSelecionada] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [pixelSelecionado, setPixelSelecionado] = useState("");

  useEffect(() => {
    carregarDados();
  }, [tenantId]);

  const carregarDados = async () => {
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (tenantData) {
      setTenant(tenantData);
      setPaginaSelecionada(tenantData.meta_page_id || "");
      setContaSelecionada(tenantData.meta_ad_account_id || "");
      setPixelSelecionado(tenantData.meta_pixel_id || "");
    }

    const { data: integracao } = await supabase.from("tenant_integrations").select("*").eq("tenant_id", tenantId).maybeSingle();
    
    if (integracao && integracao.facebook_access_token) {
      setAccessToken(integracao.facebook_access_token);
      buscarAtivosIniciais(integracao.facebook_access_token);
    }
    setLoading(false);
  };

  const buscarAtivosIniciais = async (token: string) => {
    try {
      const paginasRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name&limit=100&access_token=${token}`);
      const paginasData = await paginasRes.json();
      if (paginasData.data) setPaginasMeta(paginasData.data);

      const contasRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&limit=100&access_token=${token}`);
      const contasData = await contasRes.json();
      if (contasData.data) setContasAnuncioMeta(contasData.data);
    } catch (error) {
      console.error("Erro ao buscar ativos Meta:", error);
    }
  };

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

  const handleConectarFacebook = () => {
    setConectandoAuth(true);
    const appId = "4223060334506886"; // SEU APP ID
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/callback`);
    const scope = "ads_management,pages_manage_ads,pages_read_engagement,business_management";
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${tenantId}&scope=${scope}`;
  };

  const salvarConfiguracoes = async () => {
    setSalvando(true);
    const { error } = await supabase.from("tenants").update({
      meta_page_id: paginaSelecionada,
      meta_ad_account_id: contaSelecionada,
      meta_pixel_id: pixelSelecionado
    }).eq("id", tenantId);

    setSalvando(false);
    if (!error) {
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } else {
      alert("Erro ao salvar configurações.");
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Plug size={28} className="text-indigo-600"/> Integrações</h1>
        <p className="text-zinc-500 mt-1">Conecte as ferramentas externas para automatizar seu delivery.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
          <Facebook size={32} className="text-[#1877F2] shrink-0" />
          <div>
            <h2 className="font-bold text-lg text-zinc-900">Meta Ads (Facebook & Instagram)</h2>
            <p className="text-sm text-zinc-500">Configure sua conta para usar a Inteligência Artificial de Vendas e o Rastreador de Vitrine (Pixel).</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {!accessToken ? (
            <div className="text-center py-6">
              <p className="text-zinc-600 mb-4">Você ainda não conectou sua conta do Facebook.</p>
              <button onClick={handleConectarFacebook} disabled={conectandoAuth} className="bg-[#1877F2] hover:bg-[#166fe5] transition text-white px-8 py-3 rounded-xl font-bold shadow-md disabled:opacity-70 flex items-center justify-center gap-2 mx-auto">
                {conectandoAuth ? <Loader2 size={18} className="animate-spin"/> : <Facebook size={18}/>}
                Conectar Conta da Meta
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <CheckCircle2 size={20}/>
                <span className="font-bold text-sm">Conta conectada e autenticada com sucesso!</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Página Padrão da Loja</label>
                  <select value={paginaSelecionada} onChange={e => setPaginaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                    <option value="">Selecione a página...</option>
                    {paginasMeta.map(pag => <option key={pag.id} value={pag.id}>{pag.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Conta de Anúncios</label>
                  <select value={contaSelecionada} onChange={e => setContaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                    <option value="">Selecione a conta...</option>
                    {contasAnuncioMeta.map(conta => <option key={conta.id} value={conta.id}>{conta.name}</option>)}
                  </select>
                </div>
              </div>

              {contaSelecionada && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Pixel da Vitrine</label>
                  <select value={pixelSelecionado} onChange={e => setPixelSelecionado(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                    <option value="">Selecione o Pixel...</option>
                    {pixelsMeta.length === 0 ? <option disabled>Nenhum pixel encontrado.</option> : pixelsMeta.map(pixel => <option key={pixel.id} value={pixel.id}>{pixel.name}</option>)}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> Este Pixel será instalado na sua vitrine para rastrear as vendas.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button onClick={salvarConfiguracoes} disabled={salvando || !paginaSelecionada || !contaSelecionada || !pixelSelecionado} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                  {salvando ? <Loader2 size={18} className="animate-spin"/> : sucesso ? <CheckCircle2 size={18}/> : <Save size={18}/>}
                  {sucesso ? "Salvo com Sucesso!" : "Salvar Configurações"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}