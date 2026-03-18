// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  CreditCard, Wallet, Calendar, AlertCircle, 
  CheckCircle2, Plus, ArrowRight, ShieldCheck, Zap, 
  FileText, History, Loader2, QrCode, X
} from "lucide-react";

export default function GestaoAssinatura({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processandoCheckout, setProcessandoCheckout] = useState(false);
  
  // Estados do Modal de Pagamento
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<"cartao" | "pix">("cartao");
  const [valorRecarga, setValorRecarga] = useState("50");

  useEffect(() => {
    async function carregarDados() {
      const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (data) setTenant(data);
      setLoading(false);
    }
    carregarDados();
  }, [tenantId]);

  // ===============================================
  // FUNÇÃO QUE CHAMA A ROTA DE CHECKOUT DO NEXT.JS
  // ===============================================
  const gerarCheckout = async (type: "subscription" | "topup", amount?: number, priceId?: string) => {
    setProcessandoCheckout(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          type,
          amount,
          priceId
        }),
      });
      const data = await res.json();
      
      if (data.url) {
        // Redireciona o lojista para a página de pagamento da Stripe
        window.location.href = data.url;
      } else {
        alert("Erro ao gerar pagamento: " + (data.error || "Desconhecido"));
      }
    } catch (error) {
      alert("Falha na conexão com o financeiro.");
    } finally {
      setProcessandoCheckout(false);
    }
  };

  const handleRecarga = () => {
    gerarCheckout("topup", Number(valorRecarga));
  };

  const handleAssinarPlano = (tipo: "mensal" | "anual") => {
    // ATENÇÃO: Substitua os IDs abaixo pelos IDs reais dos seus produtos criados no painel da Stripe!
    const priceId = tipo === "mensal" ? "price_1TCLtUBno2bIxVzmyKt1Es4U" : "price_1TCLuSBno2bIxVzmit0NrkLI";
    gerarCheckout("subscription", undefined, priceId);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  const planoAtual = tenant?.plan_tier === "pro_anual" ? "PRO Anual" : "PRO Mensal";
  const valorPlano = tenant?.plan_tier === "pro_anual" ? "R$ 397,00" : "R$ 497,00";
  
  const hoje = new Date();
  const renovacaoDate = new Date(hoje);
  renovacaoDate.setDate(hoje.getDate() + 7);
  const renovacao = renovacaoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  // Aqui você puxa o saldo real que agora existe na tabela tenants
  const saldoCarteira = tenant?.wallet_balance || 0.00;
  const statusCartao = tenant?.stripe_customer_id ? "Ativo na Stripe" : null; 
  const taxaVenda = "1,9%";

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-5xl mx-auto">
      
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><CreditCard size={28} className="text-indigo-600"/> Assinatura e Saldo</h1>
        <p className="text-zinc-500 mt-1">Gerencie seu plano, métodos de pagamento e saldo da carteira.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><ShieldCheck size={24}/></div>
                <div>
                  <h2 className="font-bold text-lg text-zinc-900">Seu Plano</h2>
                  <p className="text-sm text-zinc-500">Ciclo de faturamento ativo</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={14}/> Ativo</span>
            </div>
            
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Plano Atual</p>
                <p className="text-2xl font-black text-zinc-900 mb-1">{planoAtual}</p>
                <p className="text-sm font-bold text-indigo-600">{valorPlano} / mês</p>
                
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Pedidos Ilimitados</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Inteligência Meta Ads</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Rastreamento Avançado</div>
                </div>
              </div>
              
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={14}/> Próxima Renovação</p>
                <p className="text-lg font-bold text-zinc-900 mb-4">{renovacao}</p>
                
                {planoAtual !== "PRO Anual" && (
                  <div className="bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 p-3 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Zap size={14}/> Quer economizar R$ 1.200?</p>
                    <button onClick={() => handleAssinarPlano("anual")} disabled={processandoCheckout} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center">
                      {processandoCheckout ? <Loader2 size={16} className="animate-spin"/> : "Mudar para Anual"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><CreditCard size={20}/> Forma de Pagamento</h2>
            </div>
            
            <div className="p-6">
              {statusCartao ? (
                <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg"><CheckCircle2 size={24}/></div>
                    <div>
                      <p className="font-bold text-zinc-900">Conta Conectada à Stripe</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Sistema financeiro ativo e protegido.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
                  <AlertCircle size={32} className="mx-auto text-amber-500 mb-3"/>
                  <p className="font-bold text-zinc-900">Nenhum cartão cadastrado</p>
                  <p className="text-sm text-zinc-500 mb-4 max-w-sm mx-auto">Cadastre um cartão para garantir a renovação automática e não ter sua loja pausada.</p>
                  <button onClick={() => handleAssinarPlano("mensal")} disabled={processandoCheckout} className="bg-zinc-900 text-white font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 mx-auto">
                    {processandoCheckout ? <Loader2 size={18} className="animate-spin"/> : "Cadastrar Cartão (Assinar)"}
                  </button>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6">
          
          <div className="bg-zinc-900 rounded-3xl shadow-xl overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><Wallet size={20}/> Carteira (Taxas)</h2>
              <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">{taxaVenda} / pedido</div>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-zinc-400 font-medium mb-1">Saldo Disponível</p>
              <h3 className="text-4xl font-black mb-1">R$ {saldoCarteira.toFixed(2).replace('.', ',')}</h3>
              
              <div className="flex items-center gap-2 mt-4 text-sm">
                {statusCartao ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-400/10 px-3 py-1.5 rounded-lg"><CheckCircle2 size={14}/> Recarga Automática Ativa</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-400/10 px-3 py-1.5 rounded-lg"><AlertCircle size={14}/> Recarga Manual</span>
                )}
              </div>

              <p className="text-xs text-zinc-400 mt-4 mb-4 leading-relaxed">
                Este saldo é usado para descontar os {taxaVenda} de cada pedido processado na sua vitrine.
              </p>

              <button onClick={() => setModalAberto(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                <Plus size={18} /> Adicionar Saldo
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL DE ADICIONAR SALDO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-black text-xl">Adicionar Saldo</h2>
              <button onClick={() => setModalAberto(false)} className="p-2 text-zinc-400 hover:text-zinc-800 rounded-full bg-zinc-100"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Valor da Recarga</label>
                <div className="flex gap-3 mt-2">
                  {["50", "100", "200"].map(val => (
                    <button key={val} onClick={() => setValorRecarga(val)} className={`flex-1 py-3 rounded-xl font-black text-lg border-2 transition-all ${valorRecarga === val ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={() => setTipoPagamento("cartao")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${tipoPagamento === "cartao" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                    <CreditCard size={24}/> <span className="font-bold text-sm">Cartão</span>
                  </button>
                  <button onClick={() => setTipoPagamento("pix")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${tipoPagamento === "pix" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                    <QrCode size={24}/> <span className="font-bold text-sm">PIX</span>
                  </button>
                </div>
              </div>

              <button onClick={handleRecarga} disabled={processandoCheckout} className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 ${tipoPagamento === 'pix' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}>
                {processandoCheckout ? <Loader2 size={20} className="animate-spin"/> : tipoPagamento === 'pix' ? "Gerar Código PIX" : "Pagar com Cartão"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}