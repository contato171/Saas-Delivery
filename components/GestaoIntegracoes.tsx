// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Plug, Facebook, CheckCircle2, Loader2, Save, AlertCircle, 
  ChevronDown, ChevronUp, LineChart 
} from "lucide-react";

export default function GestaoIntegracoes({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [secaoAberta, setSecaoAberta] = useState<string | null>("meta");

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [conectandoAuth, setConectandoAuth] = useState(false);
  const [paginasMeta, setPaginasMeta] = useState<any[]>([]);
  const [contasAnuncioMeta, setContasAnuncioMeta] = useState<any[]>([]);
  const [pixelsMeta, setPixelsMeta] = useState<any[]>([]);

  const [paginaSelecionada, setPaginaSelecionada] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [pixelSelecionado, setPixelSelecionado] = useState("");
  
  const [gaId, setGaId] = useState("");

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
      setGaId(tenantData.ga_measurement_id || "");
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
      console.error("Error fetching Meta assets:", error);
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
    const appId = process.env.NEXT_PUBLIC_META_APP_ID; 
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/callback`);
    const scope = "ads_management,pages_manage_ads,pages_read_engagement,business_management";
    
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${tenantId}&scope=${scope}`;
  };

  const salvarConfiguracoes = async () => {
    setSalvando(true);
    const { error } = await supabase.from("tenants").update({
      meta_page_id: paginaSelecionada,
      meta_ad_account_id: contaSelecionada,
      meta_pixel_id: pixelSelecionado,
      ga_measurement_id: gaId.trim()
    }).eq("id", tenantId);

    setSalvando(false);
    if (!error) {
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } else {
      alert("Error saving settings.");
    }
  };

  const toggleSecao = (secao: string) => {
    setSecaoAberta(secaoAberta === secao ? null : secao);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Plug size={28} className="text-indigo-600"/> Integrations</h1>
          <p className="text-zinc-500 mt-1">Connect third-party tools to cross-reference data and automate your delivery.</p>
        </div>
        <button onClick={salvarConfiguracoes} disabled={salvando} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-md disabled:opacity-50">
          {salvando ? <Loader2 size={18} className="animate-spin"/> : sucesso ? <CheckCircle2 size={18}/> : <Save size={18}/>}
          {sucesso ? "Successfully Saved!" : "Save All"}
        </button>
      </div>

      <div className="space-y-4">
        
        {/* SANFONA: META ADS */}
        <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${secaoAberta === 'meta' ? 'border-indigo-300 ring-1 ring-indigo-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
          <div onClick={() => toggleSecao('meta')} className="p-6 flex items-center justify-between cursor-pointer bg-zinc-50/30 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-[#1877F2] rounded-xl flex items-center justify-center shrink-0">
                <Facebook size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-zinc-900">Meta Ads (Facebook & Instagram)</h2>
                <p className="text-sm text-zinc-500">Configure AI Ad Generation and Pixel Tracking.</p>
              </div>
            </div>
            <div className="text-zinc-400">
              {secaoAberta === 'meta' ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>
          </div>

          {secaoAberta === 'meta' && (
            <div className="p-6 border-t border-zinc-100 bg-white space-y-8 animate-in slide-in-from-top-2">
              {!accessToken ? (
                <div className="text-center py-6 bg-zinc-50 rounded-xl border border-zinc-200">
                  <p className="text-zinc-600 mb-4">You haven't connected your Facebook account yet.</p>
                  <button onClick={handleConectarFacebook} disabled={conectandoAuth} className="bg-[#1877F2] hover:bg-[#166fe5] transition text-white px-8 py-3 rounded-xl font-bold shadow-md disabled:opacity-70 flex items-center justify-center gap-2 mx-auto">
                    {conectandoAuth ? <Loader2 size={18} className="animate-spin"/> : <Facebook size={18}/>} Connect Meta Account
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <CheckCircle2 size={20}/>
                    <span className="font-bold text-sm">Account successfully connected and authenticated!</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Default Store Page</label>
                      <select value={paginaSelecionada} onChange={e => setPaginaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                        <option value="">Select page...</option>
                        {paginasMeta.map(pag => <option key={pag.id} value={pag.id}>{pag.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Ad Account</label>
                      <select value={contaSelecionada} onChange={e => setContaSelecionada(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                        <option value="">Select ad account...</option>
                        {contasAnuncioMeta.map(conta => <option key={conta.id} value={conta.id}>{conta.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {contaSelecionada && (
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Store Pixel</label>
                      <select value={pixelSelecionado} onChange={e => setPixelSelecionado(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                        <option value="">Select Pixel...</option>
                        {pixelsMeta.length === 0 ? <option disabled>No pixel found.</option> : pixelsMeta.map(pixel => <option key={pixel.id} value={pixel.id}>{pixel.name}</option>)}
                      </select>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> This Pixel will be installed in your digital menu to track sales.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SANFONA: GOOGLE ANALYTICS */}
        <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${secaoAberta === 'google' ? 'border-amber-300 ring-1 ring-amber-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
          <div onClick={() => toggleSecao('google')} className="p-6 flex items-center justify-between cursor-pointer bg-zinc-50/30 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                <LineChart size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-zinc-900">Google Analytics (GA4)</h2>
                <p className="text-sm text-zinc-500">Measure visits, page time, and customer behavior.</p>
              </div>
            </div>
            <div className="text-zinc-400">
              {secaoAberta === 'google' ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>
          </div>

          {secaoAberta === 'google' && (
            <div className="p-6 border-t border-zinc-100 bg-white space-y-6 animate-in slide-in-from-top-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium">Connect GA4 to cross-reference access data with your sales. The code starts with <strong className="font-black">G-</strong>.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Measurement ID</label>
                <input 
                  type="text" 
                  value={gaId} 
                  onChange={e => setGaId(e.target.value.toUpperCase())} 
                  placeholder="Ex: G-X1Y2Z3A4B5" 
                  className="w-full md:w-1/2 border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}