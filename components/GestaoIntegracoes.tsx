// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Plug, Facebook, CheckCircle2, Loader2, Save, AlertCircle, 
  ChevronDown, ChevronUp, LineChart, Sparkles, LogOut 
} from "lucide-react";

export default function GestaoIntegracoes({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [secaoAberta, setSecaoAberta] = useState<string | null>("meta");

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [conectandoAuth, setConectandoAuth] = useState(false);
  const [desconectando, setDesconectando] = useState(false); // NOVO
  
  const [businessesMeta, setBusinessesMeta] = useState<any[]>([]); 
  const [paginasMeta, setPaginasMeta] = useState<any[]>([]);
  const [contasAnuncioMeta, setContasAnuncioMeta] = useState<any[]>([]);
  const [pixelsMeta, setPixelsMeta] = useState<any[]>([]);

  const [paginaSelecionada, setPaginaSelecionada] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [pixelSelecionado, setPixelSelecionado] = useState("");
  
  const [gaId, setGaId] = useState("");

  const [criandoPixel, setCriandoPixel] = useState(false);
  const [criandoConta, setCriandoConta] = useState(false); 

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

      const bmRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=id,name&limit=100&access_token=${token}`);
      const bmData = await bmRes.json();
      if (bmData.data) setBusinessesMeta(bmData.data);

    } catch (error) {
      console.error("Erro ao buscar ativos Meta:", error);
    }
  };

  const buscarPixels = async () => {
    if (!contaSelecionada || !accessToken) return;
    try {
      const actId = contaSelecionada.startsWith('act_') ? contaSelecionada : `act_${contaSelecionada}`;
      const res = await fetch(`https://graph.facebook.com/v19.0/${actId}/adspixels?fields=id,name&limit=100&access_token=${accessToken}`);
      const data = await res.json();
      if (data.data) {
        setPixelsMeta(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar pixels:", error);
    }
  };

  useEffect(() => {
    buscarPixels();
  }, [contaSelecionada, accessToken]);

  const criarContaAnuncioAutomatica = async () => {
    if (!accessToken || !tenant) return;

    if (businessesMeta.length === 0) {
      alert("Aviso: Para criar uma Conta de Anúncios, o Facebook exige que você tenha um 'Gerenciador de Negócios' (Empresa) criado. Acesse business.facebook.com, crie sua empresa e tente conectar novamente.");
      return;
    }

    setCriandoConta(true);
    try {
      const businessId = businessesMeta[0].id; 
      const nomeConta = `Nexus - ${tenant.name}`;

      const response = await fetch(`https://graph.facebook.com/v19.0/${businessId}/adaccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomeConta,
          currency: 'BRL',      
          timezone_id: 144,     
          access_token: accessToken
        })
      });

      const data = await response.json();

      if (data.id) {
        await buscarAtivosIniciais(accessToken); 
        setContaSelecionada(data.id); 
        await supabase.from("tenants").update({ meta_ad_account_id: data.id }).eq("id", tenantId);
        alert(`Sucesso! Conta de Anúncios "${nomeConta}" criada e pronta para uso.`);
      } else {
        throw new Error(data.error?.error_user_title || data.error?.message || "Erro desconhecido na Meta.");
      }
    } catch (error: any) {
      console.error("Erro ao criar conta de anúncios:", error);
      alert(`Não foi possível criar a Conta de Anúncios: ${error.message}. Algumas contas novas do Facebook têm limite de criação.`);
    } finally {
      setCriandoConta(false);
    }
  };

  const criarPixelAutomatico = async () => {
    if (!contaSelecionada || !accessToken || !tenant) return;
    
    setCriandoPixel(true);
    try {
      const actId = contaSelecionada.startsWith('act_') ? contaSelecionada : `act_${contaSelecionada}`;
      const nomeDoPixel = `Pixel Nexus - ${tenant.name}`;

      const response = await fetch(`https://graph.facebook.com/v19.0/${actId}/adspixels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nomeDoPixel, access_token: accessToken })
      });

      const data = await response.json();

      if (data.id) {
        await buscarPixels(); 
        setPixelSelecionado(data.id); 
        await supabase.from("tenants").update({ meta_pixel_id: data.id }).eq("id", tenantId);
        alert(`Sucesso! Pixel "${nomeDoPixel}" criado e vinculado à sua loja.`);
      } else {
        throw new Error(data.error?.message || "Erro desconhecido na Meta");
      }
    } catch (error: any) {
      console.error("Erro ao criar pixel:", error);
      alert(`Não foi possível criar o Pixel: ${error.message}. Verifique se a sua conta permite a criação de novos pixels.`);
    } finally {
      setCriandoPixel(false);
    }
  };

  const handleConectarFacebook = () => {
    setConectandoAuth(true);
    const appId = process.env.NEXT_PUBLIC_META_APP_ID; 
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/callback`);
    const scope = "ads_management,pages_manage_ads,pages_read_engagement,business_management";
    
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${tenantId}&scope=${scope}`;
  };

  // ==============================================================================
  // NOVA FUNÇÃO: Desconectar (Resetar) Integração com o Facebook
  // ==============================================================================
  const handleDesconectarFacebook = async () => {
    const confirmar = window.confirm(
      "Atenção: Você tem certeza que deseja desconectar o Facebook?\n\nIsso irá pausar a coleta de dados de Pixel e a gestão de anúncios da sua loja. Você precisará logar novamente para reativar."
    );
    
    if (!confirmar) return;

    setDesconectando(true);
    try {
      // 1. Limpa os tokens da tabela de integrações
      await supabase.from("tenant_integrations").update({ 
        facebook_access_token: null,
        facebook_user_id: null
      }).eq("tenant_id", tenantId);

      // 2. Limpa os IDs da loja
      await supabase.from("tenants").update({
        meta_page_id: null,
        meta_ad_account_id: null,
        meta_pixel_id: null
      }).eq("id", tenantId);

      // 3. Reseta os estados locais da tela
      setAccessToken(null);
      setPaginaSelecionada("");
      setContaSelecionada("");
      setPixelSelecionado("");
      setPaginasMeta([]);
      setContasAnuncioMeta([]);
      setBusinessesMeta([]);
      setPixelsMeta([]);

    } catch (error) {
      console.error("Erro ao desconectar Facebook:", error);
      alert("Houve um erro ao desconectar. Tente atualizar a página.");
    } finally {
      setDesconectando(false);
    }
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
      alert("Erro ao salvar configurações.");
    }
  };

  const toggleSecao = (secao: string) => {
    setSecaoAberta(secaoAberta === secao ? null : secao);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Plug size={28} className="text-indigo-600"/> Integrações</h1>
          <p className="text-zinc-500 mt-1">Conecte ferramentas externas para cruzar dados e automatizar sua operação.</p>
        </div>
        <button onClick={salvarConfiguracoes} disabled={salvando} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
          {salvando ? <Loader2 size={18} className="animate-spin"/> : sucesso ? <CheckCircle2 size={18}/> : <Save size={18}/>}
          {sucesso ? "Salvo com Sucesso!" : "Salvar Tudo"}
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
                <p className="text-sm text-zinc-500">Configure a Geração de Anúncios e o Rastreamento (Pixel).</p>
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
                  <p className="text-zinc-600 mb-4">Você ainda não conectou sua conta do Facebook.</p>
                  <button onClick={handleConectarFacebook} disabled={conectandoAuth} className="bg-[#1877F2] hover:bg-[#166fe5] transition text-white px-8 py-3 rounded-xl font-bold shadow-md disabled:opacity-70 flex items-center justify-center gap-2 mx-auto">
                    {conectandoAuth ? <Loader2 size={18} className="animate-spin"/> : <Facebook size={18}/>} Conectar Conta da Meta
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ALERTA DE SUCESSO E BOTÃO DE DESCONECTAR */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={20}/>
                      <span className="font-bold text-sm">Conta conectada e autenticada com sucesso!</span>
                    </div>
                    
                    <button 
                      onClick={handleDesconectarFacebook}
                      disabled={desconectando}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Fazer Logout desta conta do Facebook"
                    >
                      {desconectando ? <Loader2 size={14} className="animate-spin"/> : <LogOut size={14}/>}
                      {desconectando ? "Saindo..." : "Desconectar Conta"}
                    </button>
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
                      <select value={contaSelecionada} onChange={e => { setContaSelecionada(e.target.value); setPixelSelecionado(""); }} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                        <option value="">Selecione a conta...</option>
                        {contasAnuncioMeta.map(conta => <option key={conta.id} value={conta.id}>{conta.name}</option>)}
                      </select>
                      
                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={criarContaAnuncioAutomatica} 
                          disabled={criandoConta}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {criandoConta ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                          {criandoConta ? "Criando Conta..." : "Criar Conta Automaticamente"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {contaSelecionada && (
                    <div className="space-y-2 pt-4 border-t border-zinc-100">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Pixel da Loja</label>
                      <select value={pixelSelecionado} onChange={e => setPixelSelecionado(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                        <option value="">Selecione o Pixel...</option>
                        {pixelsMeta.length === 0 ? <option disabled>Nenhum pixel encontrado na conta.</option> : pixelsMeta.map(pixel => <option key={pixel.id} value={pixel.id}>{pixel.name}</option>)}
                      </select>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-2">
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <AlertCircle size={12}/> Este Pixel rastreará os acessos e vendas.
                        </p>
                        
                        <button 
                          onClick={criarPixelAutomatico} 
                          disabled={criandoPixel}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {criandoPixel ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                          {criandoPixel ? "Criando Pixel..." : "Criar Pixel Automaticamente"}
                        </button>
                      </div>
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
                <p className="text-sm text-zinc-500">Mensure visitas, tempo na página e comportamento dos clientes.</p>
              </div>
            </div>
            <div className="text-zinc-400">
              {secaoAberta === 'google' ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>
          </div>

          {secaoAberta === 'google' && (
            <div className="p-6 border-t border-zinc-100 bg-white space-y-6 animate-in slide-in-from-top-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium">Conecte o GA4 para cruzar dados de acesso com suas vendas. O código começa com <strong className="font-black">G-</strong>.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">ID de Métrica</label>
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