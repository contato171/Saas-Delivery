// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { 
  CreditCard, Calendar, AlertCircle, CheckCircle2, 
  ShieldCheck, Zap, Loader2, QrCode, X, Receipt, 
  Info, FileText, ExternalLink, Star, Gift
} from "lucide-react";

const PRICE_MENSAL = "price_1TM7ToBhOcnQDlI71vbrdkCa";
const PRICE_ANUAL = "price_1TM7UcBhOcnQDlI7mpe0d3fS";

export default function GestaoAssinatura({ tenantId }: { tenantId: string }) {
  const searchParams = useSearchParams();
  const urlSucesso = searchParams?.get("sucesso");
  const urlCancelado = searchParams?.get("cancelado");

  const [tenant, setTenant] = useState<any>(null);
  const [pedidosAtuais, setPedidosAtuais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoCheckout, setProcessandoCheckout] = useState(false);
  const [processandoPortal, setProcessandoPortal] = useState(false);
  
  const [modalFaturaAberto, setModalFaturaAberto] = useState(false);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);
  
  const [metodoEscolhido, setMetodoEscolhido] = useState<"cartao" | "pix" | "boleto">("pix");
  const [planoEscolhido, setPlanoEscolhido] = useState<"mensal" | "anual">("mensal");

  useEffect(() => {
    async function carregarDados() {
      const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (tenantData) setTenant(tenantData);

      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("tenant_id", tenantId)
        .gte("created_at", primeiroDiaMes)
        .neq("status", "cancelado")
        .neq("status", "excluido");

      if (ordersData) setPedidosAtuais(ordersData);
      setLoading(false);
    }
    carregarDados();
  }, [tenantId]);

  const gerarCheckout = async (type: "subscription" | "invoice", amount?: number, priceId?: string, paymentMethod?: string) => {
    setProcessandoCheckout(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, type, amount, priceId, paymentMethod }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Erro ao gerar pagamento: " + (data.error || "Desconhecido"));
    } catch (error) {
      alert("Falha na conexão com o financeiro.");
    } finally {
      setProcessandoCheckout(false);
    }
  };

  const abrirPortalStripe = async () => {
    setProcessandoPortal(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Erro ao acessar o portal: " + (data.error || "Desconhecido"));
    } catch (error) {
      alert("Falha na conexão.");
    } finally {
      setProcessandoPortal(false);
    }
  };

  const abrirModalAssinatura = (tipo: "mensal" | "anual") => {
    setPlanoEscolhido(tipo);
    setModalAssinaturaAberto(true);
  };

  const confirmarAssinatura = () => {
    const priceId = planoEscolhido === "mensal" ? PRICE_MENSAL : PRICE_ANUAL;
    gerarCheckout("subscription", undefined, priceId, metodoEscolhido);
  };

  if (loading) return <div className="p-10 flex justify-center min-h-[500px] items-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  // Lógica de Identificação de Status
  const isTrial = !tenant?.stripe_customer_id && tenant?.plan_tier !== "pro" && tenant?.plan_tier !== "pro_anual";
  const planoAtual = tenant?.plan_tier === "pro_anual" ? "PRO Anual" : tenant?.plan_tier === "pro" ? "PRO Mensal" : "Teste Grátis (7 Dias)";
  const valorPlanoNumber = tenant?.plan_tier === "pro_anual" ? 397.00 : 497.00;
  
  const hoje = new Date();
  const dataCriacao = new Date(tenant?.created_at || hoje);
  const renovacaoDate = new Date(dataCriacao);
  
  if (isTrial) {
    renovacaoDate.setDate(dataCriacao.getDate() + 7);
  } else {
    renovacaoDate.setDate(dataCriacao.getDate() + 30);
  }
  
  const diffTime = renovacaoDate.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const dataRenovacaoStr = renovacaoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const statusCartao = tenant?.stripe_customer_id ? true : false; 
  
  // Cálculo de Taxas
  const TAXA_PERCENTUAL = 0.019;
  const totalVendidoNoCiclo = pedidosAtuais.reduce((acc, p) => acc + Number(p.total_amount), 0);
  const totalTaxasAcumuladas = isTrial ? 0 : (totalVendidoNoCiclo * TAXA_PERCENTUAL);
  const totalFatura = isTrial ? valorPlanoNumber : (valorPlanoNumber + totalTaxasAcumuladas);

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in max-w-5xl mx-auto">
      
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><CreditCard size={28} className="text-indigo-600"/> Assinatura e Faturamento</h1>
        <p className="text-zinc-500 mt-1">Gerencie seu plano PRO, faturas e métodos de pagamento.</p>
      </div>

      {/* ========================================================================= */}
      {/* BANNERS DE SUCESSO/ERRO DO CHECKOUT */}
      {/* ========================================================================= */}
      {urlSucesso && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-4">
          <Info size={24} className="shrink-0 mt-0.5 text-indigo-600"/>
          <div>
            <h3 className="font-bold text-lg">Checkout Finalizado!</h3>
            <p className="text-sm mt-1">
              Se você pagou no Cartão ou PIX, sua loja será liberada em instantes. Se gerou um Boleto, a liberação ocorrerá assim que o banco compensar o pagamento (até 2 dias úteis). Atualize a página em breve.
            </p>
          </div>
        </div>
      )}

      {urlCancelado && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-4">
          <AlertCircle size={20} className="shrink-0 text-red-600"/>
          <p className="text-sm font-bold">O pagamento foi cancelado ou interrompido. Nenhuma cobrança foi feita.</p>
        </div>
      )}
      {/* ========================================================================= */}

      {isTrial && diasRestantes > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400"/> Período de Teste Grátis</h2>
            <p className="text-indigo-100 text-sm mt-1">Você está no teste grátis e <strong className="text-white">isento de taxas sobre vendas</strong>. Faltam {diasRestantes} dias.</p>
          </div>
          <button onClick={() => abrirModalAssinatura("mensal")} className="bg-white text-indigo-700 font-black px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform whitespace-nowrap">
            Assinar Plano PRO
          </button>
        </div>
      )}

      {isTrial && diasRestantes <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse shadow-sm">
          <div>
            <h2 className="text-xl font-black text-red-700 flex items-center gap-2"><AlertCircle size={24}/> Período de Teste Encerrado</h2>
            <p className="text-red-600 text-sm mt-1">Sua vitrine foi pausada. Assine o plano PRO agora mesmo para voltar a receber pedidos.</p>
          </div>
          <button onClick={() => abrirModalAssinatura("mensal")} className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-xl shadow-md transition-colors whitespace-nowrap">
            Ativar Assinatura
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><ShieldCheck size={24}/></div>
                <div>
                  <h2 className="font-bold text-lg text-zinc-900">Seu Plano</h2>
                  <p className="text-sm text-zinc-500">Benefícios ativos na sua conta</p>
                </div>
              </div>
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 ${isTrial ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isTrial ? <Star size={14}/> : <CheckCircle2 size={14}/>} {isTrial ? "Trial" : "Ativo"}
              </span>
            </div>
            
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Plano Atual</p>
                <p className="text-2xl font-black text-zinc-900 mb-1">{planoAtual}</p>
                <p className="text-sm font-bold text-indigo-600">R$ {valorPlanoNumber.toFixed(2).replace('.', ',')} / mês</p>
                
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Pedidos Ilimitados</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Inteligência Meta Ads</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 size={16} className="text-emerald-500"/> Suporte Prioritário</div>
                </div>
              </div>
              
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={14}/> {isTrial ? "Fim do Teste Grátis" : "Fechamento do Ciclo"}</p>
                <p className={`text-lg font-bold mb-4 ${diasRestantes <= 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                  {diasRestantes <= 0 ? "Vencido" : dataRenovacaoStr}
                </p>
                
                {planoAtual !== "PRO Anual" && (
                  <div className="bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 p-3 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Zap size={14}/> Quer economizar R$ 1.200?</p>
                    <button onClick={() => abrirModalAssinatura("anual")} disabled={processandoCheckout} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center shadow-sm">
                      Mudar para Anual
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><CreditCard size={20}/> Métodos de Pagamento</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-zinc-600 leading-relaxed">
                Utilizamos o <strong className="text-indigo-600 font-black">Stripe Checkout</strong> para processar pagamentos com máxima segurança. Suportamos PIX, Boleto e Cartão de Crédito.
              </p>

              <div className="border-t border-zinc-100 pt-6">
                {statusCartao ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><CheckCircle2 size={24}/></div>
                      <div>
                        <p className="font-bold text-emerald-900">Cobrança Configurada</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Sua forma de pagamento padrão está registrada.</p>
                      </div>
                    </div>
                    <button onClick={abrirPortalStripe} disabled={processandoPortal} className="bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors w-full sm:w-auto flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                      {processandoPortal ? <Loader2 size={16} className="animate-spin"/> : <><ExternalLink size={16}/> Gerenciar Cartão / Faturas</>}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50 border border-zinc-200 border-dashed p-5 rounded-xl">
                    <div>
                      <p className="font-bold text-zinc-900 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500"/> Nenhuma assinatura ativa</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-sm">Assine um plano para garantir o funcionamento ininterrupto da sua vitrine.</p>
                    </div>
                    <button onClick={() => abrirModalAssinatura("mensal")} disabled={processandoCheckout} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-colors w-full sm:w-auto flex items-center justify-center whitespace-nowrap">
                      Assinar Plano PRO
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* COLUNA DIREITA: FATURA */}
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-3xl shadow-xl overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="p-6 border-b border-white/10 flex items-center justify-between relative z-10">
              <h2 className="font-bold text-lg flex items-center gap-2"><Receipt size={20}/> {isTrial ? "Sua Próxima Fatura" : "Fatura Atual"}</h2>
              <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">Consolidada</div>
            </div>
            
            <div className="p-6 relative z-10">
              
              <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Mensalidade ({planoAtual}):</span>
                  <span className="font-medium text-white">R$ {valorPlanoNumber.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                  <span className="text-zinc-400 flex items-center gap-1">
                    Taxas de Uso (1,9%)
                    <div className="group relative">
                      <Info size={12} className="text-zinc-500 cursor-help" />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white text-zinc-900 text-[10px] font-bold p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-center">
                        Processado: R$ {totalVendidoNoCiclo.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </span>
                  
                  {isTrial ? (
                    <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1"><Gift size={12}/> ISENTO</span>
                  ) : (
                    <span className="font-medium text-white">R$ {totalTaxasAcumuladas.toFixed(2).replace('.', ',')}</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Total a Pagar</span>
                  <span className="text-2xl font-black text-indigo-400">R$ {totalFatura.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Vencimento:</span>
                  <span className={`font-bold ${diasRestantes <= 0 ? 'text-red-400' : 'text-white'}`}>{dataRenovacaoStr}</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${diasRestantes <= 0 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(0, 100 - (Math.max(0, diasRestantes) * 3.3))}%` }}></div>
                </div>
                <p className="text-[10px] text-zinc-500 text-center mt-1">
                  {diasRestantes > 0 ? `Faltam ${diasRestantes} dias para o pagamento` : "Pagamento Pendente"}
                </p>
              </div>

              {isTrial ? (
                <button onClick={() => abrirModalAssinatura("mensal")} className={`w-full font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4 ${diasRestantes <= 0 ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-900'}`}>
                  {diasRestantes <= 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18}/>} 
                  {diasRestantes <= 0 ? "Pagar e Reativar Loja" : "Assinar Agora"}
                </button>
              ) : (
                <>
                  {!statusCartao && diasRestantes <= 5 && (
                    <button onClick={() => setModalFaturaAberto(true)} className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4">
                      <QrCode size={18} /> Pagar Fatura Agora
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ASSINATURA */}
      {modalAssinaturaAberto && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h2 className="font-black text-xl text-zinc-900">Assinar Plano PRO</h2>
              <button onClick={() => setModalAssinaturaAberto(false)} className="p-2 text-zinc-400 hover:text-zinc-800 rounded-full bg-white shadow-sm border border-zinc-200 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Total a pagar hoje</p>
                <p className="text-3xl font-black text-indigo-700">R$ {planoEscolhido === "mensal" ? "497,00" : "4.764,00"}</p>
                <p className="text-[10px] text-indigo-500 mt-2">Você só começará a pagar a taxa de 1,9% no fechamento da sua próxima fatura em 30 dias.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3"><CheckCircle2 size={14}/> Como deseja pagar a assinatura?</label>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setMetodoEscolhido("pix")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "pix" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <QrCode size={24}/> <span className="font-bold text-xs">PIX</span>
                  </button>
                  <button onClick={() => setMetodoEscolhido("cartao")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "cartao" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <CreditCard size={24}/> <span className="font-bold text-xs">Cartão</span>
                  </button>
                  <button onClick={() => setMetodoEscolhido("boleto")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "boleto" ? "border-zinc-800 bg-zinc-100 text-zinc-800" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <FileText size={24}/> <span className="font-bold text-xs">Boleto</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={confirmarAssinatura} disabled={processandoCheckout} className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${metodoEscolhido === 'pix' ? 'bg-emerald-500 hover:bg-emerald-600' : metodoEscolhido === 'boleto' ? 'bg-zinc-800 hover:bg-zinc-900' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}>
                  {processandoCheckout ? <Loader2 size={20} className="animate-spin"/> : metodoEscolhido === 'pix' ? "Gerar PIX Copia e Cola" : metodoEscolhido === 'boleto' ? "Gerar Código de Boleto" : "Assinar com Cartão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAGAR FATURA */}
      {modalFaturaAberto && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h2 className="font-black text-xl text-zinc-900">Pagar Fatura Pendente</h2>
              <button onClick={() => setModalFaturaAberto(false)} className="p-2 text-zinc-400 hover:text-zinc-800 rounded-full bg-white shadow-sm border border-zinc-200 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Total a Pagar</p>
                <p className="text-3xl font-black text-indigo-700">R$ {totalFatura.toFixed(2).replace('.', ',')}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3"><CheckCircle2 size={14}/> Escolha o pagamento</label>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setMetodoEscolhido("pix")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "pix" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <QrCode size={24}/> <span className="font-bold text-xs">PIX</span>
                  </button>
                  <button onClick={() => setMetodoEscolhido("cartao")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "cartao" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <CreditCard size={24}/> <span className="font-bold text-xs">Cartão</span>
                  </button>
                  <button onClick={() => setMetodoEscolhido("boleto")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodoEscolhido === "boleto" ? "border-zinc-800 bg-zinc-100 text-zinc-800" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
                    <FileText size={24}/> <span className="font-bold text-xs">Boleto</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={() => gerarCheckout("invoice", totalFatura, undefined, metodoEscolhido)} disabled={processandoCheckout} className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${metodoEscolhido === 'pix' ? 'bg-emerald-500 hover:bg-emerald-600' : metodoEscolhido === 'boleto' ? 'bg-zinc-800 hover:bg-zinc-900' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}>
                  {processandoCheckout ? <Loader2 size={20} className="animate-spin"/> : metodoEscolhido === 'pix' ? "Gerar PIX Copia e Cola" : metodoEscolhido === 'boleto' ? "Gerar Código de Boleto" : "Pagar com Cartão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}