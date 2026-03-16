// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { supabase } from "../lib/supabase";
import { 
  MapPin, Store, CreditCard, Banknote, ShieldCheck, Ticket, 
  AlertCircle, CheckCircle2, Loader2, Zap, Plus
} from "lucide-react";

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { itens, subtotal, totalCarrinho, cupomAtivo, valorDesconto, adicionarItem } = useCart();
  
  // DADOS DO CLIENTE NA TELA (Substitui os prompts chatos)
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  
  const [dadosLoja, setDadosLoja] = useState<any>(null);
  const [tipoEntrega, setTipoEntrega] = useState<"entrega" | "retirada">("entrega");
  const [tipoPagamento, setTipoPagamento] = useState<"site" | "entrega">("site");
  const [metodoSelecionado, setMetodoSelecionado] = useState("Pix");
  const [cpf, setCpf] = useState("");
  const [processando, setProcessando] = useState(false);
  
  const [enderecoAtivo, setEnderecoAtivo] = useState("");
  const [modoEndereco, setModoEndereco] = useState<"padrao" | "novo">("padrao");

  // Formulário Novo Endereço
  const [buscandoCep, setBuscandoCep] = useState(false); 
  const [cepGenerico, setCepGenerico] = useState(false);
  const [novoCep, setNewCep] = useState(""); const [novaRua, setNewRua] = useState(""); const [novoNumero, setNewNumero] = useState(""); const [novoBairro, setNewBairro] = useState(""); const [novaCidade, setNewCidade] = useState(""); const [novoUf, setNewUf] = useState(""); const [novoComplemento, setNewComplemento] = useState("");

  const [verificandoLocal, setVerificandoLocal] = useState(false);
  const [localValido, setLocalValido] = useState(false);
  const [distanciaReal, setDistanciaReal] = useState<number | null>(null);
  const [erroMapa, setErroMapa] = useState("");
  const [sugestoesInteligentes, setSugestoesInteligentes] = useState<any[]>([]);

  // Lógica de CRM: Salva ou Atualiza Cliente
  const salvarNoCRM = async (nome: string, telefone: string, endereco: string) => {
    try {
      const tenantId = itens[0].produto.tenant_id;
      const { data: existente } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone", telefone)
        .single();

      if (existente) {
        const { data: atualizado } = await supabase
          .from("customers")
          .update({ name: nome, address: endereco, last_order_at: new Date() })
          .eq("id", existente.id)
          .select()
          .single();
        if (atualizado) localStorage.setItem("@saas_customer", JSON.stringify(atualizado));
      } else {
        const { data: novo } = await supabase.from("customers").insert([{
          tenant_id: tenantId,
          name: nome,
          phone: telefone,
          address: endereco
        }]).select().single();
        if (novo) localStorage.setItem("@saas_customer", JSON.stringify(novo));
      }
    } catch (e) { console.error("Erro CRM:", e); }
  };

  const validarDistanciaNoMapa = async (enderecoCompletoDestino: string, lojaConfig: any) => {
    if (!enderecoCompletoDestino) return;
    setVerificandoLocal(true); setErroMapa(""); setLocalValido(false);
    
    if (lojaConfig?.zip_code) {
      try {
        const resLoja = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lojaConfig.zip_code + ', Brasil')}`);
        const geoLoja = await resLoja.json();
        const cepMatch = enderecoCompletoDestino.match(/CEP:\s*(\d+)/);
        const cepCliente = cepMatch ? cepMatch[1] : null;
        
        let geoCliente = [];
        if (cepCliente) { 
          const resCep = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cepCliente}, Brasil`); 
          geoCliente = await resCep.json(); 
        }

        if (geoCliente.length > 0 && geoLoja.length > 0) {
          const dist = calcularDistanciaKm(parseFloat(geoLoja[0].lat), parseFloat(geoLoja[0].lon), parseFloat(geoCliente[0].lat), parseFloat(geoCliente[0].lon));
          setDistanciaReal(dist);
          if (dist <= (lojaConfig.delivery_radius_km || 15)) {
            setLocalValido(true);
          } else {
            setLocalValido(false);
            setErroMapa(`Endereço a ${dist.toFixed(1)}km. O limite é ${lojaConfig.delivery_radius_km}km.`);
          }
        } else { setLocalValido(true); }
      } catch (e) { setLocalValido(true); }
    } else { setLocalValido(true); }
    setVerificandoLocal(false);
  };

  // Carrega os dados da memória ao abrir
  useEffect(() => {
    const c = localStorage.getItem("@saas_customer");
    const clienteSalvo = c ? JSON.parse(c) : null;
    
    if (clienteSalvo) { 
      // Preenche os campos automaticamente
      setNomeCliente(clienteSalvo.name && clienteSalvo.name !== "Cliente Visitante" ? clienteSalvo.name : "");
      setTelefoneCliente(clienteSalvo.phone && clienteSalvo.phone !== "Não informado" ? clienteSalvo.phone : "");
      
      if (clienteSalvo.address) {
        setEnderecoAtivo(clienteSalvo.address); 
        setModoEndereco("padrao");
      } else {
        setModoEndereco("novo");
      }
    } else {
      setModoEndereco("novo");
    }

    async function iniciar() {
      if (itens.length === 0) return;
      const tenantId = itens[0].produto.tenant_id;
      const { data } = await supabase.from("tenants").select("name, whatsapp, zip_code, delivery_radius_km, base_delivery_fee").eq("id", tenantId).single();
      if (data) { 
        setDadosLoja(data); 
        if (clienteSalvo?.address) validarDistanciaNoMapa(clienteSalvo.address, data); 
      }
      gerarRecomendacoes(tenantId);
    }
    iniciar();
  }, []);

  const gerarRecomendacoes = async (tenantId: string) => {
    const { data } = await supabase.from("products").select("*").eq("tenant_id", tenantId).eq("active", true).limit(10);
    if (data) setSugestoesInteligentes(data.slice(0, 2));
  };

  const confirmarNovoEndereco = () => {
    if (!novoCep || !novaRua || !novoNumero || !novoBairro) return alert("Preencha os campos obrigatórios do endereço.");
    const enderecoFormatado = `${novaRua}, ${novoNumero}, ${novoBairro}, ${novaCidade} - ${novoUf} | CEP: ${novoCep} ${novoComplemento ? '| Compl: ' + novoComplemento : ''}`;
    setEnderecoAtivo(enderecoFormatado); 
    validarDistanciaNoMapa(enderecoFormatado, dadosLoja);
  };

  const buscarCepGenerico = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, '');
    setNewCep(cepLimpo);
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`); 
      const data = await res.json();
      if (!data.erro) {
        setNewCidade(data.localidade); setNewUf(data.uf); 
        setNewRua(data.logradouro || ""); setNewBairro(data.bairro || "");
        setCepGenerico(!data.logradouro);
      }
    } catch (e) {} finally { setBuscandoCep(false); }
  };

  const taxaEntrega = tipoEntrega === "entrega" ? (dadosLoja?.base_delivery_fee || 0) : 0;
  const totalGeral = totalCarrinho + taxaEntrega;

  const handleFinalizarPedido = async () => {
    // Validações antes de enviar
    if (!nomeCliente.trim() || !telefoneCliente.trim()) {
      return alert("Por favor, preencha seu Nome e WhatsApp no topo da tela para podermos identificar seu pedido.");
    }
    if (tipoEntrega === "entrega" && (!enderecoAtivo || !localValido)) {
      return alert("Por favor, valide seu endereço de entrega.");
    }
    
    setProcessando(true);
    try {
      const tenantId = itens[0].produto.tenant_id;
      const metodoFinal = tipoPagamento === "site" ? `Online: ${metodoSelecionado}` : `Na Entrega: ${metodoSelecionado}`;
      const enderecoFinal = tipoEntrega === "entrega" ? enderecoAtivo : "Retirada no Balcão";

      // CRM: Salva o cliente e o endereço permanentemente
      await salvarNoCRM(nomeCliente, telefoneCliente, enderecoFinal);

      const { data: pedidoSalvo, error } = await supabase.from("orders").insert([{ 
        tenant_id: tenantId, 
        customer_name: nomeCliente, 
        customer_address: enderecoFinal, 
        payment_method: metodoFinal, 
        total_amount: totalGeral, 
        status: 'pendente' 
      }]).select().single();

      if (error) throw error;

      const itensParaSalvar = itens.map((item: any) => ({
        order_id: pedidoSalvo.id,
        product_name: item.produto.name,
        quantity: item.quantidade,
        unit_price: item.produto.price,
        options_text: `${item.adicionais?.map(a => a.name).join(", ") || ""} ${item.observacao ? "\nObs: " + item.observacao : ""}`
      }));
      await supabase.from("order_items").insert(itensParaSalvar);

      let textoPedido = `*NOVO PEDIDO!* 🚀\n*Cliente:* ${nomeCliente}\n*Contato:* ${telefoneCliente}\n*Tipo:* ${tipoEntrega === 'entrega' ? '🛵 Entrega' : '🏃‍♂️ Retirada'}\n`;
      if (tipoEntrega === 'entrega') textoPedido += `*Endereço:* ${enderecoFinal}\n`;
      textoPedido += `*Pagamento:* ${metodoFinal}\n\n*🛒 ITENS:*\n`;
      itens.forEach((item: any) => { textoPedido += `${item.quantidade}x ${item.produto.name}\n`; });
      textoPedido += `\n*TOTAL: R$ ${totalGeral.toFixed(2).replace(".", ",")}*`;

      const wpp = dadosLoja?.whatsapp ? dadosLoja.whatsapp.replace(/\D/g, '') : ""; 
      if(wpp) window.open(`https://wa.me/55${wpp}?text=${encodeURIComponent(textoPedido)}`, "_blank");
      
      onClose();
    } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessando(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-zinc-50 overflow-y-auto animate-in fade-in text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-red-600 font-black text-xl flex items-center gap-2"><ShieldCheck size={24} /> Checkout Seguro</div>
          <button onClick={onClose} className="text-zinc-500 font-bold text-sm">Voltar</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          
          {/* NOVA SEÇÃO: DADOS DO CLIENTE (Substitui os prompts) */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-zinc-900">Seus Dados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wide">Nome Completo *</label>
                <input 
                  type="text" 
                  value={nomeCliente} 
                  onChange={(e) => setNomeCliente(e.target.value)} 
                  placeholder="Como podemos te chamar?" 
                  className="w-full border border-zinc-300 rounded-lg p-3 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wide">WhatsApp *</label>
                <input 
                  type="tel" 
                  value={telefoneCliente} 
                  onChange={(e) => setTelefoneCliente(e.target.value)} 
                  placeholder="(DD) 99999-9999" 
                  className="w-full border border-zinc-300 rounded-lg p-3 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-sm flex gap-2">
            <button onClick={() => setTipoEntrega("entrega")} className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${tipoEntrega === "entrega" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500"}`}><MapPin size={18} /> Receber</button>
            <button onClick={() => setTipoEntrega("retirada")} className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${tipoEntrega === "retirada" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500"}`}><Store size={18} /> Retirar</button>
          </div>
          
          {tipoEntrega === "entrega" && (
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
              <h2 className="font-bold text-lg text-zinc-900">Onde vamos entregar?</h2>
              
              {enderecoAtivo && modoEndereco === "padrao" && (
                <div onClick={() => { setModoEndereco("padrao"); setLocalValido(true); }} className={`border rounded-xl p-4 cursor-pointer transition-all border-red-600 bg-red-50`}>
                  <p className="font-bold text-sm text-zinc-900">Meu Endereço Salvo</p>
                  <p className="text-xs text-zinc-600 mt-1">{enderecoAtivo}</p>
                </div>
              )}

              <div onClick={() => setModoEndereco("novo")} className={`border rounded-xl p-4 cursor-pointer transition-all ${modoEndereco === "novo" ? "border-red-600 bg-red-50" : "border-zinc-200"}`}>
                <p className="font-bold text-sm text-zinc-900">{enderecoAtivo ? "Entregar em outro local" : "Cadastrar Endereço"}</p>
                {modoEndereco === "novo" && (
                  <div className="mt-4 space-y-3" onClick={e => e.stopPropagation()}>
                    <input type="text" maxLength={8} value={novoCep} onChange={(e) => buscarCepGenerico(e.target.value)} placeholder="CEP" className="w-full border border-zinc-300 rounded-lg p-2 text-sm outline-none focus:border-red-600" />
                    <div className="flex gap-2">
                      <input type="text" value={novaRua} onChange={e => setNewRua(e.target.value)} placeholder="Rua" className="flex-1 border border-zinc-300 rounded-lg p-2 text-sm outline-none focus:border-red-600" />
                      <input type="text" value={novoNumero} onChange={e => setNewNumero(e.target.value)} placeholder="Nº" className="w-20 border border-zinc-300 rounded-lg p-2 text-sm outline-none focus:border-red-600" />
                    </div>
                    <input type="text" value={novoBairro} onChange={e => setNewBairro(e.target.value)} placeholder="Bairro" className="w-full border border-zinc-300 rounded-lg p-2 text-sm outline-none focus:border-red-600" />
                    <button onClick={confirmarNovoEndereco} className="w-full bg-zinc-900 text-white font-bold py-2 rounded-lg text-xs">Salvar e Validar Endereço</button>
                  </div>
                )}
              </div>
              
              {localValido && modoEndereco === "novo" && <p className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Endereço validado!</p>}
              {erroMapa && <p className="text-xs text-red-500 font-bold">{erroMapa}</p>}
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-zinc-900">Pagamento</h2>
            <div className="grid grid-cols-2 gap-3">
              {["Pix", "Dinheiro", "Cartão"].map(m => (
                <button key={m} onClick={() => setMetodoSelecionado(m)} className={`p-4 border rounded-xl font-bold text-sm transition-all ${metodoSelecionado === m ? "border-red-600 bg-red-50 text-red-600" : "border-zinc-200 text-zinc-500"}`}>{m}</button>
              ))}
            </div>
            <input type="text" placeholder="CPF na nota (Opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full mt-4 border border-zinc-300 rounded-lg p-3 text-sm focus:border-red-600 outline-none transition-all" />
          </div>
        </div>

        <div className="lg:w-80 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 sticky top-24">
            <h3 className="font-bold mb-4 text-zinc-900">Resumo</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-zinc-500"><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              <div className="flex justify-between text-sm text-zinc-500"><span>Taxa Fixa</span><span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span></div>
              <div className="flex justify-between font-black text-xl pt-3 border-t border-zinc-100"><span>Total</span><span className="text-red-600">R$ {totalGeral.toFixed(2).replace('.', ',')}</span></div>
            </div>
            <button onClick={handleFinalizarPedido} disabled={processando || (tipoEntrega === 'entrega' && !localValido)} className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-md hover:bg-red-700 transition-all disabled:bg-zinc-200 disabled:text-zinc-400">
              {processando ? "Processando..." : "Finalizar Pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}