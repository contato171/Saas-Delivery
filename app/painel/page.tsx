"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import MotorMarketing from "../../components/MotorMarketing";
import PedidosAoVivo from "../../components/PedidosAoVivo";
import DashboardInicio from "../../components/DashboardInicio";
import GestaoCardapio from "../../components/GestaoCardapio";
import ConfigLoja from "../../components/ConfigLoja";
import GestaoCRM from "../../components/GestaoCRM";

export default function PainelLojista() {
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio"); 
  const [menuLojaAberto, setMenuLojaAberto] = useState(false);

  // Estados para o formulário de Login / Cadastro
  const [modoAuth, setModoAuth] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nomeRestaurante, setNomeRestaurante] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [slugGerado, setSlugGerado] = useState("");

  // Efeito mágico: gera o subdomínio automaticamente enquanto ele digita o nome
  useEffect(() => {
    if (modoAuth === "cadastro") {
      const gerado = nomeRestaurante
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, ""); // Remove espaços e caracteres especiais
      setSlugGerado(gerado);
    }
  }, [nomeRestaurante, modoAuth]);

  useEffect(() => {
    const slugSalvo = localStorage.getItem("@saas_admin_slug");
    if (slugSalvo) {
      verificarSessao(slugSalvo);
    } else {
      setLoading(false);
    }
  }, []);

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
    // Busca o restaurante pelo email e senha
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("email", email)
      .eq("senha", senha)
      .single();
    
    if (tenantData) {
      localStorage.setItem("@saas_admin_slug", tenantData.slug);
      setTenant(tenantData);
      await buscarDados(tenantData.id);
    } else {
      alert("E-mail ou senha incorretos!");
    }
    setLoading(false);
  };

  const fazerCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }
    setLoading(true);

    // Salva o novo restaurante no banco de dados
    const { data, error } = await supabase
      .from("tenants")
      .insert([
        {
          name: nomeRestaurante,
          slug: slugGerado,
          nome_responsavel: nomeResponsavel,
          email: email,
          senha: senha,
          plan_tier: "free" // Plano inicial padrão
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao criar conta. Talvez este subdomínio ou e-mail já esteja em uso.");
    } else if (data) {
      // Entra automaticamente após criar a conta
      localStorage.setItem("@saas_admin_slug", data.slug);
      setTenant(data);
      await buscarDados(data.id);
    }
    setLoading(false);
  };

  const handleSair = () => {
    localStorage.removeItem("@saas_admin_slug");
    setTenant(null);
    setEmail("");
    setSenha("");
  };

  // TELA DE LOGIN / CADASTRO
  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-800 p-8 rounded-xl max-w-md w-full border border-zinc-700 shadow-2xl">
          
          {/* Abas de Navegação */}
          <div className="flex gap-4 mb-8 border-b border-zinc-700 pb-4">
            <button 
              onClick={() => setModoAuth("login")}
              className={`flex-1 font-bold text-center pb-2 transition-colors ${modoAuth === "login" ? "text-blue-500 border-b-2 border-blue-500" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setModoAuth("cadastro")}
              className={`flex-1 font-bold text-center pb-2 transition-colors ${modoAuth === "cadastro" ? "text-blue-500 border-b-2 border-blue-500" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Criar Conta
            </button>
          </div>

          {modoAuth === "login" ? (
            <form onSubmit={fazerLogin} className="flex flex-col gap-4 animate-in fade-in">
              <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h1>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 mt-4 rounded-lg hover:bg-blue-700 transition-colors">
                {loading ? "A acessar..." : "Entrar no Painel"}
              </button>
            </form>
          ) : (
            <form onSubmit={fazerCadastro} className="flex flex-col gap-4 animate-in fade-in">
              <h1 className="text-2xl font-bold text-white mb-2">Configure o seu Delivery</h1>
              
              <input type="text" value={nomeRestaurante} onChange={(e) => setNomeRestaurante(e.target.value)} placeholder="Nome do Restaurante (ex: Esquinas Bar)" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              
              {/* O Subdomínio Gerado (Apenas Leitura) */}
              {slugGerado && (
                 <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 opacity-70">
                   <span className="text-zinc-500">app.seusite.com/</span>
                   <span className="text-blue-400 font-bold ml-1">{slugGerado}</span>
                 </div>
              )}

              <input type="text" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} placeholder="Nome do Responsável" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de acesso" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              
              <div className="flex gap-2">
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirme" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 mt-4 rounded-lg hover:bg-blue-700 transition-colors">
                {loading ? "A criar..." : "Criar Meu Negócio"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // TELA DO PAINEL (Permanece intacta com as suas rotas e blindagens)
  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans">
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col min-h-screen shadow-sm z-10">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white font-black text-sm">
              {tenant.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <h2 className="text-zinc-900 font-black text-lg tracking-tight truncate">{tenant.name}</h2>
              <span className="text-xs text-zinc-500 font-medium">Plano: <span className="uppercase text-blue-600">{tenant.plan_tier || 'Free'}</span></span>
            </div>
          </div>
        </div>
        
        <nav className="mt-6 flex flex-col gap-1 px-3 flex-1 overflow-y-auto">
          <button onClick={() => setAbaAtiva("inicio")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "inicio" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🏠</span> Início</button>
          <div className="my-2 border-t border-zinc-100"></div>
          <button onClick={() => setAbaAtiva("pedidos")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "pedidos" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🧾</span> Pedidos</button>
          <button onClick={() => setAbaAtiva("cardapio")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "cardapio" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🍔</span> Cardápios</button>
          <div className="my-2 border-t border-zinc-100"></div>

          <div>
            <button onClick={() => { setMenuLojaAberto(!menuLojaAberto); setAbaAtiva("loja"); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${abaAtiva === "loja" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
              <div className="flex items-center gap-3"><span className="text-lg">🏪</span> Lojas</div>
              <span className={`text-xs transition-transform duration-200 ${menuLojaAberto ? "rotate-180" : ""}`}>▼</span>
            </button>
            {menuLojaAberto && (
              <div className="ml-9 mt-1 flex flex-col gap-1 border-l-2 border-zinc-100 pl-2">
                <button onClick={() => setAbaAtiva("loja")} className="text-left px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">Configurações</button>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-zinc-100"></div>
          <button onClick={() => setAbaAtiva("marketing")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "marketing" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">✨</span> Marketing IA</button>
          
          <button onClick={() => setAbaAtiva("crm")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "crm" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">👥</span> CRM & Clientes</button>
        </nav>

        <div className="p-4 border-t border-zinc-200">
           <button onClick={handleSair} className="w-full flex items-center justify-center gap-2 text-red-600 font-bold text-sm p-2 hover:bg-red-50 rounded-lg transition-colors">
              Sair do Painel
           </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-screen">
        {abaAtiva === "inicio" && tenant && <DashboardInicio tenant={tenant} />}
        
        {abaAtiva === "pedidos" && tenant && (
          <div className="w-full max-w-7xl animate-in fade-in">
            {/* @ts-ignore */}
            <PedidosAoVivo tenantId={tenant.id} />
          </div>
        )}
        
        {abaAtiva === "marketing" && tenant && (
          <div className="w-full max-w-6xl animate-in fade-in">
            {/* @ts-ignore */}
            <MotorMarketing tenantId={tenant.id} />
          </div>
        )}
        
        {abaAtiva === "cardapio" && tenant && (
          <div className="w-full max-w-7xl animate-in fade-in">
            {/* @ts-ignore */}
            <GestaoCardapio tenantId={tenant.id} produtos={produtos} onUpdate={() => buscarDados(tenant.id)} />
          </div>
        )}
        
        {abaAtiva === "loja" && tenant && (
          <div className="w-full max-w-5xl animate-in fade-in">
            {/* @ts-ignore */}
            <ConfigLoja tenant={tenant} onUpdate={() => buscarDados(tenant.id)} />
          </div>
        )}
        
        {abaAtiva === "crm" && tenant && (
          <div className="w-full max-w-6xl animate-in fade-in">
            {/* @ts-ignore */}
            <GestaoCRM tenantId={tenant.id} />
          </div>
        )}
      </main>
    </div>
  );
}