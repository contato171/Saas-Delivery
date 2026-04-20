// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import MotorMarketing from "../../components/MotorMarketing";
import PedidosAoVivo from "../../components/PedidosAoVivo";
import DashboardInicio from "../../components/DashboardInicio";
import GestaoCardapio from "../../components/GestaoCardapio";
import ConfigLoja from "../../components/ConfigLoja";
import GestaoCRM from "../../components/GestaoCRM";
import GestaoIntegracoes from "../../components/GestaoIntegracoes";
import GestaoAssinatura from "../../components/GestaoAssinatura";
import RadarAoVivo from "../../components/RadarAoVivo";
import GestaoMotoboys from "../../components/GestaoMotoboys";

import { 
  Home, Compass, Users, LayoutDashboard, CreditCard, 
  Settings, LogOut, Bell, HelpCircle, Store, Sparkles, Plug, Edit3, Activity,
  BellRing, ChevronRight, Bike
} from "lucide-react";

export default function PainelLojista() {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio"); 

  const [alertaPedidoNovo, setAlertaPedidoNovo] = useState<any>(null);
  const audioAlarmeRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/alerta.mp3');
    audio.loop = true; 
    audioAlarmeRef.current = audio;
  }, []);

  useEffect(() => {
    if (!tenant) return;

    const canalPedidosGlobais = supabase.channel(`global_orders_${tenant.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenant.id}`
      }, (payload) => {
        const novo = payload.new;
        setAlertaPedidoNovo(novo); 
        
        if (audioAlarmeRef.current) {
          audioAlarmeRef.current.play().catch(e => console.log("Navegador bloqueou autoplay", e));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalPedidosGlobais);
    };
  }, [tenant]);

  const silenciarEVerPedido = () => {
    if (audioAlarmeRef.current) {
      audioAlarmeRef.current.pause();
      audioAlarmeRef.current.currentTime = 0;
    }
    setAlertaPedidoNovo(null);
    mudarAba("pedidos"); 
  };

  const apenasSilenciar = () => {
    if (audioAlarmeRef.current) {
      audioAlarmeRef.current.pause();
      audioAlarmeRef.current.currentTime = 0;
    }
    setAlertaPedidoNovo(null); 
  };

  const [modoAuth, setModoAuth] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nomeRestaurante, setNomeRestaurante] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [slugGerado, setSlugGerado] = useState("");

  useEffect(() => {
    if (modoAuth === "cadastro") {
      const gerado = nomeRestaurante.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      setSlugGerado(gerado);
    }
  }, [nomeRestaurante, modoAuth]);

  useEffect(() => {
    const abaSalva = localStorage.getItem("@saas_admin_aba");
    if (abaSalva) setAbaAtiva(abaSalva);

    const slugSalvo = localStorage.getItem("@saas_admin_slug");
    if (slugSalvo) verificarSessao(slugSalvo);
    else setLoading(false); 
  }, []);

  const mudarAba = (aba: string) => {
    setAbaAtiva(aba);
    localStorage.setItem("@saas_admin_aba", aba);
  };

  const buscarDados = async (tenantId: string) => {
    const { data: produtosData } = await supabase.from("products").select("*").eq("tenant_id", tenantId);
    setProdutos(produtosData || []);
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (tenantData) setTenant(tenantData);
  };

  const verificarSessao = async (slugParaBuscar: string) => {
    setLoading(true);
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("slug", slugParaBuscar).single();
    if (tenantData) {
      localStorage.setItem("@saas_admin_slug", slugParaBuscar);
      setTenant(tenantData);
      await buscarDados(tenantData.id);
    } else {
      localStorage.removeItem("@saas_admin_slug");
    }
    setLoading(false); 
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("email", email).eq("senha", senha).single();
    if (tenantData) {
      localStorage.setItem("@saas_admin_slug", tenantData.slug);
      setTenant(tenantData);
      await buscarDados(tenantData.id);
    } else alert("E-mail ou senha incorretos!");
    setLoading(false);
  };

  const fazerCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmarSenha) return alert("As senhas não coincidem!");
    setLoading(true);
    const { data, error } = await supabase.from("tenants").insert([{ name: nomeRestaurante, slug: slugGerado, nome_responsavel: nomeResponsavel, email: email, senha: senha, plan_tier: "free" }]).select().single();
    if (error) alert("Erro ao criar conta.");
    else if (data) {
      localStorage.setItem("@saas_admin_slug", data.slug);
      setTenant(data);
      await buscarDados(data.id);
    }
    setLoading(false);
  };

  const handleSair = () => {
    localStorage.removeItem("@saas_admin_slug");
    localStorage.removeItem("@saas_admin_aba"); 
    setTenant(null); setEmail(""); setSenha("");
  };

  if (loading && !tenant) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden font-sans p-6">
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
          <div className="absolute h-[600px] w-[600px] bg-gradient-to-r from-indigo-600 to-purple-700 blur-[120px] rounded-full animate-pulse"></div>
        </div>

        <div className="z-10 animate-in fade-in zoom-in-95 duration-700 w-full max-w-md">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl border border-zinc-800 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] flex flex-col">
            
            <div className="flex flex-col items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-[bounce_3s_infinite]">
                N
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Nexus <span className="text-indigo-400">Delivery</span></h1>
            </div>

            <div className="flex gap-1 mb-8 bg-zinc-950 p-1.5 rounded-full border border-zinc-800">
              <button onClick={() => setModoAuth("login")} className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "login" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>Entrar</button>
              <button onClick={() => setModoAuth("cadastro")} className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "cadastro" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>Criar Conta</button>
            </div>

            {modoAuth === "login" ? (
              <form onSubmit={fazerLogin} className="flex flex-col gap-4 animate-in fade-in">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-black text-white leading-tight tracking-tighter">Acessar Painel Nexus</h2>
                  <p className="text-zinc-400 mt-2 text-sm">Bem-vindo de volta!</p>
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold py-4 mt-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform">{loading ? "Verificando..." : "Acessar Nexus"}</button>
              </form>
            ) : (
              <form onSubmit={fazerCadastro} className="flex flex-col gap-4 animate-in fade-in">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-black text-white leading-tight tracking-tighter">Começar a Vender</h2>
                  <p className="text-zinc-400 mt-2 text-sm">Configure sua operação digital.</p>
                </div>
                <input type="text" value={nomeRestaurante} onChange={(e) => setNomeRestaurante(e.target.value)} placeholder="Nome do Restaurante" className="w-full px-5 py-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                {slugGerado && <div className="flex items-center bg-zinc-950/40 border border-zinc-800 border-dashed rounded-2xl px-5 py-3 opacity-80 text-xs"><span className="text-zinc-500">seuapp.com/</span><span className="text-indigo-400 font-bold ml-1 tracking-tight">{slugGerado}</span></div>}
                <input type="text" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} placeholder="Nome do Responsável" className="w-full px-5 py-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail profissional" className="w-full px-5 py-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <div className="flex gap-3">
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Criar Senha" className="w-full px-5 py-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                  <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirmar" className="w-full px-5 py-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold py-4 mt-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform">{loading ? "Criando..." : "Criar Conta Nexus"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hoje = new Date();
  const dataRenovacao = new Date(hoje);
  dataRenovacao.setDate(hoje.getDate() + 7);
  const dataFormatada = dataRenovacao.toLocaleDateString('pt-BR');
  const planoNome = tenant.plan_tier === 'pro_anual' ? 'PRO Anual' : tenant.plan_tier === 'pro' ? 'PRO Mensal' : 'Teste Grátis';

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans overflow-hidden">

      {/* POP-UP DE ALARME GLOBAL */}
      {alertaPedidoNovo && (
        <div className="fixed inset-0 z-[99999] bg-zinc-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-[0_0_80px_-15px_rgba(220,38,38,0.5)] relative overflow-hidden border-4 border-red-500 animate-[pulse_2s_infinite]">
             <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse"></div>

             <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-[bounce_1s_infinite]">
               <BellRing size={48} className="animate-pulse" />
             </div>

             <h2 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Novo Pedido!</h2>
             <p className="text-zinc-500 font-medium mb-6 leading-relaxed">
               O cliente <strong className="text-zinc-900">{alertaPedidoNovo.customer_name}</strong> acabou de realizar um pedido no valor de <strong className="text-emerald-600">R$ {Number(alertaPedidoNovo.total_amount).toFixed(2).replace('.',',')}</strong>.
             </p>

             <div className="flex flex-col gap-3">
               <button onClick={silenciarEVerPedido} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                 Atender Pedido <ChevronRight size={20}/>
               </button>
               <button onClick={apenasSilenciar} className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-3 rounded-xl transition-colors">
                 Silenciar Alarme
               </button>
             </div>
          </div>
        </div>
      )}
      
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col min-h-screen z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        
        <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md">
             {tenant.name.charAt(0)}
          </div>
          <h2 className="font-black text-xl text-zinc-900 tracking-tight truncate">Nexus<span className="text-indigo-600">Delivery</span></h2>
        </div>

        <div className="p-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm relative group">
            <h3 className="font-black text-zinc-900 text-lg leading-tight truncate mb-0.5">{tenant.name}</h3>
            <p className="text-xs text-zinc-500 font-medium mb-4">Estabelecimento</p>
            
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Plano Atual:</p>
            <div className="inline-block bg-indigo-600 text-white font-bold text-xs px-3 py-1 rounded-full mb-3 shadow-sm shadow-indigo-600/30">
              {planoNome}
            </div>

            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 space-y-2">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-zinc-500 uppercase">Status</span>
                 <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Ativo</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-zinc-500 uppercase">Próx. Cobrança</span>
                 <span className="text-xs font-black text-zinc-900">{dataFormatada}</span>
               </div>
            </div>
            
            <button onClick={() => mudarAba("financeiro")} className="absolute top-4 right-4 text-zinc-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 font-bold text-xs"><Edit3 size={14}/> Editar</button>
          </div>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          
          <button onClick={() => mudarAba("aovivo")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 relative overflow-hidden group ${abaAtiva === "aovivo" ? "bg-zinc-900 text-white shadow-md" : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 text-red-700 hover:shadow-sm"}`}>
            <Activity size={18} className={abaAtiva === "aovivo" ? "text-emerald-400" : "text-red-600"}/> 
            Radar Ao Vivo
            <span className={`absolute right-4 w-2 h-2 rounded-full ${abaAtiva === "aovivo" ? "bg-emerald-400" : "bg-red-500"} animate-ping`}></span>
          </button>

          <div className="my-1"></div>

          <button onClick={() => mudarAba("inicio")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "inicio" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Home size={18} className={abaAtiva === "inicio" ? "text-indigo-600" : "text-zinc-400"}/> Início
          </button>
          
          <button onClick={() => mudarAba("pedidos")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "pedidos" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Compass size={18} className={abaAtiva === "pedidos" ? "text-indigo-600" : "text-zinc-400"}/> Pedidos
          </button>

          {/* ABA DO ENTREGADOR ATUALIZADA */}
          <button onClick={() => mudarAba("motoboys")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "motoboys" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Bike size={18} className={abaAtiva === "motoboys" ? "text-indigo-600" : "text-zinc-400"}/> Entregador Parceiro
          </button>
          
          <button onClick={() => mudarAba("cardapio")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "cardapio" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <LayoutDashboard size={18} className={abaAtiva === "cardapio" ? "text-indigo-600" : "text-zinc-400"}/> Cardápios
          </button>
          
          <button onClick={() => mudarAba("loja")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "loja" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Store size={18} className={abaAtiva === "loja" ? "text-indigo-600" : "text-zinc-400"}/> Configurações
          </button>

          <button onClick={() => mudarAba("financeiro")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "financeiro" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <CreditCard size={18} className={abaAtiva === "financeiro" ? "text-indigo-600" : "text-zinc-400"}/> Financeiro
          </button>

          <div className="my-2 border-t border-zinc-100 mx-2"></div>

          <button onClick={() => mudarAba("marketing")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "marketing" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Sparkles size={18} className={abaAtiva === "marketing" ? "text-indigo-600" : "text-zinc-400"}/> Marketing
          </button>
          
          <button onClick={() => mudarAba("crm")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "crm" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Users size={18} className={abaAtiva === "crm" ? "text-indigo-600" : "text-zinc-400"}/> CRM & Clientes
          </button>

          <button onClick={() => mudarAba("integracoes")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${abaAtiva === "integracoes" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Plug size={18} className={abaAtiva === "integracoes" ? "text-indigo-600" : "text-zinc-400"}/> Integrações
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
          <div className="flex gap-1">
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Bell size={18}/></button>
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><HelpCircle size={18}/></button>
          </div>
          <button onClick={handleSair} className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={18}/></button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none -z-10"></div>
        
        {abaAtiva === "inicio" && tenant && <DashboardInicio tenant={tenant} onNavigate={mudarAba}/>}
        {abaAtiva === "pedidos" && tenant && <div className="w-full max-w-7xl animate-in fade-in"><PedidosAoVivo tenantId={tenant.id} /></div>}
        {abaAtiva === "aovivo" && tenant && <div className="w-full max-w-7xl animate-in fade-in"><RadarAoVivo tenant={tenant} /></div>}
        {abaAtiva === "marketing" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><MotorMarketing tenantId={tenant.id} /></div>}
        {abaAtiva === "motoboys" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoMotoboys tenantId={tenant.id} /></div>}
        {abaAtiva === "cardapio" && tenant && <div className="w-full max-w-7xl animate-in fade-in"><GestaoCardapio tenantId={tenant.id} /></div>}
        {abaAtiva === "loja" && tenant && <div className="w-full max-w-5xl animate-in fade-in"><ConfigLoja tenant={tenant} onUpdate={() => buscarDados(tenant.id)} /></div>}
        {abaAtiva === "crm" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoCRM tenantId={tenant.id} /></div>}
        {abaAtiva === "integracoes" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoIntegracoes tenantId={tenant.id} /></div>}
        {abaAtiva === "financeiro" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoAssinatura tenantId={tenant.id} /></div>}
      </main>
    </div>
  );
}