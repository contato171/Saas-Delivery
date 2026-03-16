// @ts-nocheck
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

  // CORREÇÃO: Memória de Sessão e Aba Ativa
  useEffect(() => {
    // Tenta restaurar a aba que o usuário estava antes de dar F5
    const abaSalva = localStorage.getItem("@saas_admin_aba");
    if (abaSalva) setAbaAtiva(abaSalva);

    const slugSalvo = localStorage.getItem("@saas_admin_slug");
    if (slugSalvo) {
      verificarSessao(slugSalvo);
    } else {
      setLoading(false); // Só tira o loading se não tiver chave salva
    }
  }, []);

  // Toda vez que mudar de aba, salva no navegador para lembrar no F5
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
    setLoading(false); // Agora sim a tela é liberada
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
    localStorage.removeItem("@saas_admin_aba"); // Limpa a memória da aba ao sair
    setTenant(null);
    setEmail("");
    setSenha("");
  };

  // TELA DE CARREGAMENTO INICIAL PARA EVITAR "PULO" PARA O LOGIN NO F5
  if (loading && !tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // TELA DE LOGIN / CADASTRO PREMIUM
  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative overflow-hidden font-sans">
        
        {/* Fundo Animado Sutil (Mesh Gradient) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -inset-x-20 -top-40 h-[600px] bg-gradient-to-r from-blue-600 to-indigo-700 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute -inset-x-20 -bottom-40 h-[600px] bg-gradient-to-r from-purple-700 to-pink-600 blur-[120px] rounded-full animate-pulseDelay"></div>
        </div>

        {/* Lado Esquerdo: Formulário (Foco na Ação) */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 z-10 animate-in fade-in slide-in-from-left duration-700">
          <div className="bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl max-w-lg w-full border border-zinc-800 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] flex flex-col">
            
            {/* Logo / Título SaaS */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                D
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Delivery <span className="text-blue-500">IA</span></h1>
            </div>

            {/* Abas de Navegação Premium */}
            <div className="flex gap-1 mb-10 bg-zinc-950 p-1.5 rounded-full border border-zinc-800">
              <button 
                onClick={() => setModoAuth("login")}
                className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "login" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => setModoAuth("cadastro")}
                className={`flex-1 font-bold text-center py-3 rounded-full text-sm transition-all duration-300 ${modoAuth === "cadastro" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Criar Conta
              </button>
            </div>

            {/* Formulário Dinâmico */}
            {modoAuth === "login" ? (
              <form onSubmit={fazerLogin} className="flex flex-col gap-5 animate-in fade-in">
                <div className="mb-4">
                  <h2 className="text-3xl font-black text-white leading-tight tracking-tighter">Aceder ao seu Painel de Controle</h2>
                  <p className="text-zinc-400 mt-2">Bem-vindo de volta! Digite suas credenciais para gerir suas vendas.</p>
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail profissional" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha secreta" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold py-4 mt-6 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                  {loading ? "Verificando Credenciais..." : "Aceder Máquina de Vendas"}
                </button>
              </form>
            ) : (
              <form onSubmit={fazerCadastro} className="flex flex-col gap-5 animate-in fade-in">
                <div className="mb-4">
                  <h2 className="text-3xl font-black text-white leading-tight tracking-tighter">Começar a Vender Mais Hoje</h2>
                  <p className="text-zinc-400 mt-2">Configure sua loja digital e deixe nossa IA impulsionar seus resultados.</p>
                </div>
                
                <input type="text" value={nomeRestaurante} onChange={(e) => setNomeRestaurante(e.target.value)} placeholder="Nome do Restaurante (ex: Esquinas Bar)" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                
                {/* O Subdomínio Gerado (Apenas Leitura - Estilo Link) */}
                {slugGerado && (
                   <div className="flex items-center bg-zinc-950/40 border border-zinc-800 border-dashed rounded-2xl px-5 py-4 opacity-80 text-sm">
                     <span className="text-zinc-600">seuapp.com/</span>
                     <span className="text-blue-400 font-bold ml-1 tracking-tight">{slugGerado}</span>
                     <span className="text-zinc-700 ml-auto">exclusivo</span>
                   </div>
                )}

                <input type="text" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} placeholder="Nome do Responsável" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail profissional de acesso" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                
                <div className="flex gap-3">
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Criar Senha" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                  <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirmar" className="w-full px-5 py-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600" required />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-extrabold py-4 mt-6 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                  {loading ? "Criando seu Delivery..." : "Lançar Minha Máquina de Vendas"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Lado Direito: Proposta de Valor (Foco no Benefício e Impacto Visual) */}
        <div className="flex-1 bg-zinc-900 md:flex flex-col items-center justify-center p-10 md:p-20 relative z-0 border-l border-zinc-800 animate-in fade-in slide-in-from-right duration-700">
          
          <div className="max-w-2xl text-center md:text-left">
            {/* Frase de Impacto Premium */}
            <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.95] tracking-tighter mb-6">
              Abra sua <br />
              Máquina de Vendas <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">Digital</span>.
            </h1>
            
            <p className="text-xl text-zinc-400 mb-16 max-w-xl">
              Nossa IA gerencia seu marketing, atrai clientes e otimiza sua operação, enquanto você foca no que importa: <span className="font-bold text-zinc-100">preparar o melhor produto</span>.
            </p>

            {/* Cards de Benefícios / Prova de Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              
              {[
                { icon: "✨", title: "Marketing com IA", desc: "Campanhas automáticas no Insta e Google Ads que trazem clientes de verdade.", shadow: "shadow-blue-500/10" },
                { icon: "🧾", title: "Gestão Sem Taxas", desc: "Cardápio digital próprio. Venda sem pagar porcentagem para apps terceiros.", shadow: "shadow-purple-500/10" },
                { icon: "👥", title: "CRM & Retenção", desc: "Conheça seu cliente e venda mais de uma vez para a mesma pessoa.", shadow: "shadow-pink-500/10" },
                { icon: "🚀", title: "Pedidos Ao Vivo", desc: "Painel agilizado para cozinha e entregadores. Zero confusão.", shadow: "shadow-emerald-500/10" }
              ].map((item, idx) => (
                <div key={idx} className={`bg-zinc-800/60 p-6 rounded-2xl border border-zinc-700 flex items-start gap-4 shadow-lg ${item.shadow} hover:border-zinc-600 hover:scale-[1.02] transition-all`}>
                  <div className="text-3xl mt-1">{item.icon}</div>
                  <div>
                    <h4 className="font-extrabold text-white text-lg tracking-tight">{item.title}</h4>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}

            </div>

          </div>

          {/* Toque Visual de IA (Círculo de Foco) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none"></div>
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
          <button onClick={() => mudarAba("inicio")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "inicio" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🏠</span> Início</button>
          <div className="my-2 border-t border-zinc-100"></div>
          <button onClick={() => mudarAba("pedidos")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "pedidos" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🧾</span> Pedidos</button>
          <button onClick={() => mudarAba("cardapio")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "cardapio" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">🍔</span> Cardápios</button>
          <div className="my-2 border-t border-zinc-100"></div>

          <div>
            <button onClick={() => { setMenuLojaAberto(!menuLojaAberto); mudarAba("loja"); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${abaAtiva === "loja" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
              <div className="flex items-center gap-3"><span className="text-lg">🏪</span> Lojas</div>
              <span className={`text-xs transition-transform duration-200 ${menuLojaAberto ? "rotate-180" : ""}`}>▼</span>
            </button>
            {menuLojaAberto && (
              <div className="ml-9 mt-1 flex flex-col gap-1 border-l-2 border-zinc-100 pl-2">
                <button onClick={() => mudarAba("loja")} className="text-left px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">Configurações</button>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-zinc-100"></div>
          <button onClick={() => mudarAba("marketing")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "marketing" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">✨</span> Marketing IA</button>
          
          <button onClick={() => mudarAba("crm")} className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${abaAtiva === "crm" ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}><span className="text-lg">👥</span> CRM & Clientes</button>
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
            <GestaoCardapio tenantId={tenant.id} />
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