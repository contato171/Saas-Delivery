// @ts-nocheck
"use client";

import GestaoAssinatura from "../../components/GestaoAssinatura";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import MotorMarketing from "../../components/MotorMarketing";
import PedidosAoVivo from "../../components/PedidosAoVivo";
import DashboardInicio from "../../components/DashboardInicio";
import GestaoCardapio from "../../components/GestaoCardapio";
import ConfigLoja from "../../components/ConfigLoja";
import GestaoCRM from "../../components/GestaoCRM";
import GestaoIntegracoes from "../../components/GestaoIntegracoes";

import { 
  Home, Compass, Users, LayoutDashboard, CreditCard, 
  Settings, LogOut, Bell, HelpCircle, Store, Sparkles, Plug 
} from "lucide-react";

export default function PainelLojista() {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio"); 
  const [menuLojaAberto, setMenuLojaAberto] = useState(false);

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

  if (loading && !tenant) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -inset-x-20 -top-40 h-[600px] bg-gradient-to-r from-blue-600 to-indigo-700 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute -inset-x-20 -bottom-40 h-[600px] bg-gradient-to-r from-purple-700 to-pink-600 blur-[120px] rounded-full animate-pulseDelay"></div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-12 z-10 animate-in fade-in slide-in-from-left duration-700">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl max-w-lg w-full border border-zinc-800 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] flex flex-col">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">D</div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Delivery <span className="text-blue-500">IA</span></h1>
            </div>

            <div className="flex gap-1 mb-10 bg-zinc-950 p-1.5 rounded-full border border-zinc-800">
              <button onClick={() => setModoAuth("login")} className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "login" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>Entrar</button>
              <button onClick={() => setModoAuth("cadastro")} className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "cadastro" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}>Criar Conta</button>
            </div>

            {modoAuth === "login" ? (
              <form onSubmit={fazerLogin} className="flex flex-col gap-5 animate-in fade-in">
                <div className="mb-4"><h2 className="text-3xl font-black text-white leading-tight tracking-tighter">Aceder ao seu Painel</h2><p className="text-zinc-400 mt-2">Bem-vindo de volta!</p></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold py-4 mt-6 rounded-2xl shadow-lg">{loading ? "Verificando..." : "Aceder Máquina de Vendas"}</button>
              </form>
            ) : (
              <form onSubmit={fazerCadastro} className="flex flex-col gap-5 animate-in fade-in">
                <div className="mb-4"><h2 className="text-3xl font-black text-white leading-tight tracking-tighter">Começar a Vender</h2><p className="text-zinc-400 mt-2">Configure sua loja digital.</p></div>
                <input type="text" value={nomeRestaurante} onChange={(e) => setNomeRestaurante(e.target.value)} placeholder="Nome do Restaurante" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                {slugGerado && <div className="flex items-center bg-zinc-950/40 border border-zinc-800 border-dashed rounded-2xl px-5 py-4 opacity-80 text-sm"><span className="text-zinc-600">seuapp.com/</span><span className="text-blue-400 font-bold ml-1 tracking-tight">{slugGerado}</span></div>}
                <input type="text" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} placeholder="Nome do Responsável" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail profissional" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                <div className="flex gap-3">
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Criar Senha" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                  <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirmar" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold py-4 mt-6 rounded-2xl shadow-lg">{loading ? "Criando..." : "Lançar Minha Máquina de Vendas"}</button>
              </form>
            )}
          </div>
        </div>

        <div className="flex-1 bg-zinc-900 md:flex flex-col items-center justify-center p-10 md:p-20 relative z-0 border-l border-zinc-800 animate-in fade-in slide-in-from-right duration-700">
          <div className="max-w-2xl text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.95] tracking-tighter mb-6">Abra sua <br /> Máquina de Vendas <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">Digital</span>.</h1>
            <p className="text-xl text-zinc-400 mb-16 max-w-xl">Nossa IA gerencia seu marketing, atrai clientes e otimiza sua operação.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              {[
                { icon: "✨", title: "Marketing com IA", desc: "Campanhas automáticas no Insta e Google Ads.", shadow: "shadow-blue-500/10" },
                { icon: "🧾", title: "Gestão Sem Taxas", desc: "Cardápio digital próprio.", shadow: "shadow-purple-500/10" },
                { icon: "👥", title: "CRM & Retenção", desc: "Venda mais de uma vez para a mesma pessoa.", shadow: "shadow-pink-500/10" },
                { icon: "🚀", title: "Pedidos Ao Vivo", desc: "Painel agilizado para cozinha e entregadores.", shadow: "shadow-emerald-500/10" }
              ].map((item, idx) => (
                <div key={idx} className={`bg-zinc-800/60 p-6 rounded-2xl border border-zinc-700 flex items-start gap-4 shadow-lg ${item.shadow} hover:scale-[1.02] transition-all`}>
                  <div className="text-3xl mt-1">{item.icon}</div>
                  <div><h4 className="font-extrabold text-white text-lg tracking-tight">{item.title}</h4><p className="text-sm text-zinc-400 mt-1 leading-relaxed">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================
  // MENU LATERAL PREMIUM
  // =======================================================
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans overflow-hidden">
      
      <aside className="w-72 bg-white border-r border-zinc-200 hidden md:flex flex-col min-h-screen z-10">
        
        {/* CARD DO PLANO (IGUAL AO PRINT) */}
        <div className="p-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="font-black text-zinc-900 text-base leading-tight truncate">{tenant.name}</h3>
            <p className="text-xs text-zinc-500 font-medium mb-5">Estabelecimento</p>
            
            <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wider mb-2">Plan:</p>
            <div className="inline-block bg-[#1877F2] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-full mb-5">
              PRO Ativo
            </div>

            <div className="w-full h-px bg-zinc-100 mb-5"></div>

            <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wider mb-1">Plan Details:</p>
            <p className="font-black text-zinc-900 text-xl uppercase">{tenant.plan_tier || 'FREE'}</p>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 px-5 flex flex-col gap-1 overflow-y-auto">
          
          <button onClick={() => mudarAba("inicio")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "inicio" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Home size={18} className={abaAtiva === "inicio" ? "text-indigo-600" : "text-zinc-400"}/> Início
          </button>
          
          <button onClick={() => mudarAba("pedidos")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "pedidos" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Compass size={18} className={abaAtiva === "pedidos" ? "text-indigo-600" : "text-zinc-400"}/> Pedidos
          </button>
          
          <button onClick={() => mudarAba("cardapio")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "cardapio" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <LayoutDashboard size={18} className={abaAtiva === "cardapio" ? "text-indigo-600" : "text-zinc-400"}/> Cardápios
          </button>
          
          <button onClick={() => mudarAba("loja")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "loja" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Store size={18} className={abaAtiva === "loja" ? "text-indigo-600" : "text-zinc-400"}/> Lojas
          </button>

          <div className="my-3 border-t border-zinc-100 mx-2"></div>

          <button onClick={() => mudarAba("marketing")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "marketing" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Sparkles size={18} className={abaAtiva === "marketing" ? "text-indigo-600" : "text-zinc-400"}/> Marketing IA
          </button>
          
          <button onClick={() => mudarAba("crm")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "crm" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Users size={18} className={abaAtiva === "crm" ? "text-indigo-600" : "text-zinc-400"}/> CRM & Clientes
          </button>

          <button onClick={() => mudarAba("integracoes")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "integracoes" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
            <Plug size={18} className={abaAtiva === "integracoes" ? "text-indigo-600" : "text-zinc-400"}/> Integrações
          </button>

          <button onClick={() => mudarAba("financeiro")} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${abaAtiva === "financeiro" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
          <CreditCard size={18} className={abaAtiva === "financeiro" ? "text-indigo-600" : "text-zinc-400"}/> Financeiro
          </button>
        </nav>

        {/* ÍCONES DE RODAPÉ */}
        <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
          <div className="flex gap-1">
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Bell size={18}/></button>
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><HelpCircle size={18}/></button>
          </div>
          <button onClick={handleSair} className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={18}/></button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-indigo-50/60 to-transparent pointer-events-none -z-10"></div>
        
        {abaAtiva === "inicio" && tenant && <DashboardInicio tenant={tenant} />}
        {abaAtiva === "pedidos" && tenant && <div className="w-full max-w-7xl animate-in fade-in"><PedidosAoVivo tenantId={tenant.id} /></div>}
        {abaAtiva === "marketing" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><MotorMarketing tenantId={tenant.id} /></div>}
        {abaAtiva === "cardapio" && tenant && <div className="w-full max-w-7xl animate-in fade-in"><GestaoCardapio tenantId={tenant.id} /></div>}
        {abaAtiva === "loja" && tenant && <div className="w-full max-w-5xl animate-in fade-in"><ConfigLoja tenant={tenant} onUpdate={() => buscarDados(tenant.id)} /></div>}
        {abaAtiva === "crm" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoCRM tenantId={tenant.id} /></div>}
        {abaAtiva === "integracoes" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoIntegracoes tenantId={tenant.id} /></div>}
        {abaAtiva === "financeiro" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoAssinatura tenantId={tenant.id} /></div>}
        {abaAtiva === "financeiro" && tenant && <div className="w-full max-w-6xl animate-in fade-in"><GestaoAssinatura tenantId={tenant.id} /></div>}
      </main>
    </div>
  );
}