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
  const [slug, setSlug] = useState("");
  const [tenant, setTenant] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio"); 
  const [menuLojaAberto, setMenuLojaAberto] = useState(false);

  useEffect(() => {
    const slugSalvo = localStorage.getItem("@saas_admin_slug");
    if (slugSalvo) {
      setSlug(slugSalvo);
      fazerLogin(slugSalvo);
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

  const fazerLogin = async (slugParaBuscar: string) => {
    setLoading(true);
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("slug", slugParaBuscar).single();
    
    if (tenantData) {
      localStorage.setItem("@saas_admin_slug", slugParaBuscar);
      setTenant(tenantData);
      await buscarDados(tenantData.id);
    } else {
      localStorage.removeItem("@saas_admin_slug");
      alert("Restaurante não encontrado!");
    }
    setLoading(false);
  };

  const handleSair = () => {
    localStorage.removeItem("@saas_admin_slug");
    setTenant(null);
    setSlug("");
  };

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <form onSubmit={(e) => { e.preventDefault(); fazerLogin(slug); }} className="bg-zinc-800 p-8 rounded-xl max-w-md w-full border border-zinc-700 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">Acesso ao Painel</h1>
          <p className="text-zinc-400 mb-6 text-sm">Digite o seu subdomínio para gerir as suas vendas.</p>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="ex: esquinasbar" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
            {loading ? "A entrar..." : "Aceder Máquina de Vendas"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans">
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col min-h-screen shadow-sm z-10">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white font-black text-sm">
              {tenant.name.charAt(0)}
            </div>
            <h2 className="text-zinc-900 font-black text-lg tracking-tight truncate">{tenant.name}</h2>
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