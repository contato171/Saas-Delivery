"use client";



import { useState, useEffect } from "react";

import { useCart } from "./CartContext";

import { supabase } from "../lib/supabase";

import {

  MapPin, Store, CreditCard, Banknote, ShieldCheck, Ticket,

  AlertCircle, CheckCircle2, Loader2, Save, X, Plus, Zap

} from "lucide-react";



function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {

  const R = 6371; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

}



export default function CheckoutModal({ onClose }: { onClose: () => void }) {

  // Puxa os dados consolidados do Cérebro

  const { itens, subtotal, totalCarrinho, cupomAtivo, valorDesconto, adicionarItem } = useCart();

 

  const [cliente, setCliente] = useState<any>(null);

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



  // GPS ESTRITO

  const [verificandoLocal, setVerificandoLocal] = useState(false);

  const [localValido, setLocalValido] = useState(false);

  const [distanciaReal, setDistanciaReal] = useState<number | null>(null);

  const [erroMapa, setErroMapa] = useState("");



  const [sugestoesInteligentes, setSugestoesInteligentes] = useState<any[]>([]);



  // MOTOR DE GPS RÍGIDO - SEM BRECHAS

  const validarDistanciaNoMapa = async (enderecoCompletoDestino: string, lojaConfig: any) => {

    if (!enderecoCompletoDestino) {

      setLocalValido(false); setErroMapa("Por favor, informe seu endereço de entrega."); return;

    }

   

    setVerificandoLocal(true); setErroMapa(""); setLocalValido(false);

   

    if (lojaConfig?.zip_code) {

      try {

        const resLoja = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lojaConfig.zip_code + ', Brasil')}`);

        const geoLoja = await resLoja.json();

        if (geoLoja.length === 0) throw new Error("CEP da loja não encontrado no satélite.");



        const cepMatch = enderecoCompletoDestino.match(/CEP:\s*(\d+)/);

        const cepCliente = cepMatch ? cepMatch[1] : null;

       

        let geoCliente = [];

        if (cepCliente) {

          const resCep = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cepCliente}, Brasil`);

          geoCliente = await resCep.json();

        }

       

        if (geoCliente.length === 0) {

           const partesStr = enderecoCompletoDestino.split('|')[0].split(',');

           const ruaCliente = partesStr[0]?.trim() || "";

           let cidadeCliente = ""; for(let p of partesStr) { if (p.includes('-')) cidadeCliente = p.split('-')[0].trim(); }

           if (cidadeCliente) {

             const resRua = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ruaCliente + ', ' + cidadeCliente + ', Brasil')}`);

             geoCliente = await resRua.json();

             // Tentativa apenas por cidade se a rua falhar

             if(geoCliente.length === 0) {

               const resCidade = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cidadeCliente + ', Brasil')}`);

               geoCliente = await resCidade.json();

             }

           }

        }



        if (geoCliente.length > 0) {

          const dist = calcularDistanciaKm(parseFloat(geoLoja[0].lat), parseFloat(geoLoja[0].lon), parseFloat(geoCliente[0].lat), parseFloat(geoCliente[0].lon));

          setDistanciaReal(dist);

         

          // O BLOQUEIO REAL: Se a distância for maior que o raio da loja, REJEITA. Sem exceções.

          if (dist <= (lojaConfig.delivery_radius_km || 10)) {

            setLocalValido(true);

          } else {

            setLocalValido(false);

            setErroMapa(`O endereço está a ${dist.toFixed(1)}km. O limite da loja é ${lojaConfig.delivery_radius_km}km. Bloqueado.`);

          }

        } else {

          setLocalValido(false);

          setErroMapa("Endereço não encontrado pelo GPS. Verifique os dados digitados.");

        }

      } catch (error: any) {

        setLocalValido(false);

        setErroMapa("Falha na comunicação com o satélite: " + error.message);

      }

    } else {

      // Se a loja não tem CEP cadastrado, libera por padrão (Loja assumiu o risco)

      setLocalValido(true);

    }

    setVerificandoLocal(false);

  };



  useEffect(() => {

    const c = localStorage.getItem("@saas_customer");

    const clienteSalvo = c ? JSON.parse(c) : null;

   

    if (clienteSalvo && clienteSalvo.address) {

      setCliente(clienteSalvo);

      setEnderecoAtivo(clienteSalvo.address);

      setModoEndereco("padrao");

    } else {

      setModoEndereco("novo");

      setErroMapa("Faça login ou cadastre um endereço abaixo para calcular a taxa.");

    }



    async function iniciar() {

      if (itens.length === 0 || !itens[0]?.produto?.tenant_id) return;

      const tenantId = itens[0].produto.tenant_id;

     

      const { data } = await supabase.from("tenants").select("whatsapp, zip_code, delivery_radius_km, base_delivery_fee").eq("id", tenantId).single();

      if (data) {

        setDadosLoja(data);

        if (clienteSalvo?.address) validarDistanciaNoMapa(clienteSalvo.address, data);

      }

      gerarRecomendacoes(tenantId);

    }

    iniciar();

  }, []);



  const gerarRecomendacoes = async (tenantId: string) => {

    if (itens.length === 0) return;

    const { data: produtosAtivos } = await supabase.from("products").select("*").eq("tenant_id", tenantId).eq("active", true);

    if (!produtosAtivos) return;

   

    const nomesNoCarrinho = itens.map((i: any) => i.produto.name);

    let sugestoes = produtosAtivos.filter(p => !nomesNoCarrinho.includes(p.name)).sort((a, b) => a.price - b.price).slice(0, 2);

    setSugestoesInteligentes(sugestoes);

  };



  const confirmarNovoEndereco = () => {

    if (!novoCep || !novaRua || !novoNumero || !novoBairro || !novaCidade) return alert("Preencha todos os campos obrigatórios.");

    const enderecoFormatado = `${novaRua}, ${novoNumero}, ${novoBairro}, ${novaCidade} - ${novoUf} | CEP: ${novoCep} ${novoComplemento ? '| Compl: ' + novoComplemento : ''}`;

   

    const clienteTemp = cliente || { name: "Cliente Visitante", phone: "Não informado" };

    setCliente(clienteTemp);

    setEnderecoAtivo(enderecoFormatado);

    validarDistanciaNoMapa(enderecoFormatado, dadosLoja);

  };



  const buscarCepGenerico = async (cepDigitado: string) => {

    const cepLimpo = cepDigitado.replace(/\D/g, '');

    setNewCep(cepLimpo);

    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);

    try {

      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`); const data = await res.json();

      if (!data.erro) {

        setNewCidade(data.localidade); setNewUf(data.uf);

        if (!data.logradouro) { setCepGenerico(true); setNewRua(""); setNewBairro(""); }

        else { setCepGenerico(false); setNewRua(data.logradouro); setNewBairro(data.bairro); }

      }

    } catch (error) {} finally { setBuscandoCep(false); }

  };



  const alternarModoEndereco = (modo: "padrao" | "novo") => {

    setModoEndereco(modo);

    if (modo === "padrao") {

      setEnderecoAtivo(cliente?.address || "");

      if(cliente?.address) validarDistanciaNoMapa(cliente.address, dadosLoja);

    }

  };



  // Taxa Matemática Real

  const taxaEntrega = tipoEntrega === "entrega" ? (dadosLoja?.base_delivery_fee || 0) : 0;

  const totalGeral = totalCarrinho + taxaEntrega;



  const handleFinalizarPedido = async () => {

    if (tipoEntrega === "entrega" && (!enderecoAtivo || !localValido)) return alert("Endereço de entrega não verificado ou fora da área.");

    if (!dadosLoja?.whatsapp) return alert("A loja não possui WhatsApp configurado no painel.");

   

    const nomeClienteFinal = cliente?.name || prompt("Como podemos te chamar?");

    if (!nomeClienteFinal) return;



    setProcessando(true);

    try {

      const tenantId = itens[0].produto.tenant_id;

      const metodoFinal = tipoPagamento === "site" ? `Online: ${metodoSelecionado}` : `Na Entrega: ${metodoSelecionado}`;

      const { data: pedidoSalvo, error } = await supabase.from("orders").insert([{ tenant_id: tenantId, customer_name: nomeClienteFinal, customer_address: tipoEntrega === "entrega" ? enderecoAtivo : "Retirada no Balcão", payment_method: metodoFinal, total_amount: totalGeral, status: 'pendente' }]).select().single();

      if (error) throw error;



      const itensParaSalvar = itens.map((item: any) => {

        let textoOpcoes = "";

        if (item.adicionais && item.adicionais.length > 0) textoOpcoes += "Adicionais:\n" + item.adicionais.map((add: any) => `- ${add.name}`).join("\n");

        if (item.observacao) textoOpcoes += (textoOpcoes ? "\n" : "") + "Obs: " + item.observacao;

        if (cpf) textoOpcoes += `\nCPF na Nota: ${cpf}`;

        return { order_id: pedidoSalvo.id, product_name: item.produto.name, quantity: item.quantidade, unit_price: item.produto.price, options_text: textoOpcoes };

      });

      await supabase.from("order_items").insert(itensParaSalvar);



      let textoPedido = `*NOVO PEDIDO!* 🚀\n*ID:* #${pedidoSalvo.id.split('-')[0].toUpperCase()}\n\n*Cliente:* ${nomeClienteFinal}\n*Tipo:* ${tipoEntrega === 'entrega' ? '🛵 Entrega' : '🏃‍♂️ Retirada'}\n`;

      if (tipoEntrega === 'entrega') { textoPedido += `*Endereço:* ${enderecoAtivo}\n`; if (distanciaReal) textoPedido += `*Distância:* ${distanciaReal.toFixed(1)} km\n`; }

      textoPedido += `*Pagamento:* ${metodoFinal}\n\n*🛒 ITENS:*\n`;

      itens.forEach((item: any) => { textoPedido += `${item.quantidade}x ${item.produto.name} (R$ ${(item.precoTotal || 0).toFixed(2)})\n`; });

      textoPedido += `\nSubtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;

      if (cupomAtivo) textoPedido += `\nDesconto (${cupomAtivo.desconto}%): - R$ ${valorDesconto.toFixed(2).replace(".", ",")}`;

      if (taxaEntrega > 0) textoPedido += `\nTaxa: R$ ${taxaEntrega.toFixed(2).replace(".", ",")}`;

      textoPedido += `\n*💰 TOTAL: R$ ${totalGeral.toFixed(2).replace(".", ",")}*`;



      const wpp = dadosLoja.whatsapp.replace(/\D/g, '');

      window.open(`https://wa.me/${wpp.startsWith('55') ? wpp : `55${wpp}`}?text=${encodeURIComponent(textoPedido)}`, "_blank");

      onClose();

    } catch (e: any) { alert("Erro ao gerar pedido: " + e.message); } finally { setProcessando(false); }

  };



  return (

    <div className="fixed inset-0 z-[300] bg-zinc-50 overflow-y-auto animate-in fade-in text-zinc-900 font-sans">

      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 shadow-sm">

        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="text-red-600 font-black text-2xl flex items-center gap-2"><ShieldCheck size={28} /> Checkout Seguro</div>

          <button onClick={onClose} className="text-zinc-500 font-bold hover:text-red-600 transition-colors">Voltar à Sacola</button>

        </div>

      </header>



      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-10">

       

        {/* LADO ESQUERDO: CONTROLES */}

        <div className="flex-1 space-y-6">

          <h1 className="text-2xl font-bold mb-6">Detalhes da Entrega</h1>

         

          <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-sm flex gap-2">

            <button onClick={() => setTipoEntrega("entrega")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${tipoEntrega === "entrega" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500 hover:bg-zinc-50"}`}><MapPin size={18} /> Receber em Casa</button>

            <button onClick={() => setTipoEntrega("retirada")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${tipoEntrega === "retirada" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500 hover:bg-zinc-50"}`}><Store size={18} /> Retirar no Balcão</button>

          </div>

         

          {tipoEntrega === "entrega" && (

            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm animate-in fade-in">

              <h2 className="font-bold text-lg mb-4">Onde vamos entregar?</h2>

              <div className="space-y-3">

               

                {cliente?.address && (

                  <div className={`border rounded-xl transition-all ${modoEndereco === "padrao" ? "border-red-600 bg-red-50/30" : "border-zinc-200 hover:border-red-300"}`}>

                    <label className="flex items-start gap-4 p-4 cursor-pointer">

                      <input type="radio" checked={modoEndereco === "padrao"} onChange={() => alternarModoEndereco("padrao")} className="mt-1 w-4 h-4 accent-red-600" />

                      <div className="flex-1 w-full">

                        <p className="font-bold text-zinc-900">Meu Endereço Salvo</p>

                        <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{cliente.address}</p>

                        {modoEndereco === "padrao" && (

                          <div className="mt-3 pt-3 border-t border-red-100">

                            {verificandoLocal ? <p className="text-sm text-yellow-600 font-bold flex items-center gap-2"><Loader2 size={16} className="animate-spin"/> Checando viabilidade...</p>

                            : erroMapa ? <p className="text-sm text-red-600 font-bold flex items-center gap-1"><AlertCircle size={16}/> {erroMapa}</p>

                            : localValido ? <p className="text-sm text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={16}/> Área validada ({distanciaReal?.toFixed(1)} km)</p> : null}

                          </div>

                        )}

                      </div>

                    </label>

                  </div>

                )}



                <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${modoEndereco === "novo" ? "border-red-600 bg-red-50/30" : "border-zinc-200 hover:border-red-300"}`}>

                  <input type="radio" checked={modoEndereco === "novo"} onChange={() => alternarModoEndereco("novo")} className="mt-1 w-4 h-4 accent-red-600" />

                  <div className="flex-1 w-full">

                    <p className="font-bold text-zinc-900">Entregar em outro local</p>

                    {modoEndereco === "novo" && (

                      <div className="mt-4 space-y-4 animate-in fade-in" onClick={e => e.preventDefault()}>

                        <div className="grid grid-cols-3 gap-3"><div className="col-span-1"><label className="block text-xs font-bold text-zinc-700 mb-1">CEP *</label><input type="text" maxLength={8} value={novoCep} onChange={(e) => buscarCepGenerico(e.target.value)} placeholder="00000000" className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" /></div><div className="col-span-2"><label className="block text-xs font-bold text-zinc-700 mb-1">Cidade / UF</label><input type="text" value={novaCidade ? `${novaCidade} - ${novoUf}` : ""} disabled className="w-full border border-zinc-200 bg-zinc-100 rounded-lg p-2.5 text-sm text-zinc-500" /></div></div>

                        <div className="grid grid-cols-4 gap-3"><div className="col-span-3"><label className="block text-xs font-bold text-zinc-700 mb-1">Rua *</label><input type="text" value={novaRua} onChange={(e) => setNewRua(e.target.value)} disabled={!cepGenerico && !!novaRua} className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!novaRua) ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-white border-zinc-300 focus:ring-2 focus:ring-red-600'}`} /></div><div className="col-span-1"><label className="block text-xs font-bold text-zinc-700 mb-1">Nº *</label><input type="text" value={novoNumero} onChange={(e) => setNewNumero(e.target.value)} className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" /></div></div>

                        <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-zinc-700 mb-1">Bairro *</label><input type="text" value={novoBairro} onChange={(e) => setNewBairro(e.target.value)} disabled={!cepGenerico && !!novoBairro} className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!novoBairro) ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-white border-zinc-300 focus:ring-2 focus:ring-red-600'}`} /></div><div><label className="block text-xs font-bold text-zinc-700 mb-1">Complemento</label><input type="text" value={novoComplemento} onChange={(e) => setNewComplemento(e.target.value)} placeholder="Apt, Casa" className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" /></div></div>

                        <button type="button" onClick={confirmarNovoEndereco} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-lg text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"><MapPin size={16} /> Validar Disponibilidade</button>

                       

                        {verificandoLocal && modoEndereco === "novo" ? <p className="text-sm text-yellow-600 font-bold flex items-center justify-center gap-2 mt-2"><Loader2 size={16} className="animate-spin"/> Conectando ao Satélite...</p> : erroMapa && modoEndereco === "novo" ? <p className="text-sm text-red-600 font-bold flex items-center justify-center gap-1 mt-2 text-center leading-tight"><AlertCircle size={16} className="shrink-0"/> {erroMapa}</p> : localValido && modoEndereco === "novo" ? (<div><p className="text-sm text-emerald-600 font-bold flex items-center justify-center gap-1 mt-2"><CheckCircle2 size={16}/> Endereço Seguro e Aprovado!</p></div>) : null}

                      </div>

                    )}

                  </div>

                </label>

              </div>

            </div>

          )}



          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">

            <h2 className="font-bold text-lg mb-4">Forma de Pagamento</h2>

            <div className="flex gap-4 mb-6">

              <button onClick={() => setTipoPagamento("site")} className={`flex-1 py-2 font-bold text-sm border-b-2 transition-colors flex justify-center items-center gap-2 ${tipoPagamento === "site" ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><CreditCard size={18}/> Pagar Online</button>

              <button onClick={() => setTipoPagamento("entrega")} className={`flex-1 py-2 font-bold text-sm border-b-2 transition-colors flex justify-center items-center gap-2 ${tipoPagamento === "entrega" ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Banknote size={18}/> Pagar na Entrega</button>

            </div>

            {tipoPagamento === "site" ? (

              <label className={`flex items-center gap-4 border p-4 rounded-xl cursor-pointer transition-all ${metodoSelecionado === "Pix" ? "border-red-600 bg-red-50" : "border-zinc-200 hover:bg-zinc-50"}`}>

                <input type="radio" checked={metodoSelecionado === "Pix"} onChange={() => setMetodoSelecionado("Pix")} className="w-5 h-5 accent-red-600" />

                <div><span className="font-bold text-zinc-900 block">Pagar com Pix Seguro</span><span className="text-xs text-zinc-500">A chave será gerada ao finalizar</span></div>

              </label>

            ) : (

              <div className="grid grid-cols-2 gap-3">

                {["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Vale Refeição"].map(metodo => (

                  <label key={metodo} className={`flex items-center gap-3 border p-4 rounded-xl cursor-pointer transition-all ${metodoSelecionado === metodo ? "border-red-600 bg-red-50 shadow-sm" : "border-zinc-200 hover:bg-zinc-50"}`}>

                    <input type="radio" checked={metodoSelecionado === metodo} onChange={() => setMetodoSelecionado(metodo)} className="w-4 h-4 accent-red-600" /><span className="font-medium text-sm text-zinc-800">{metodo}</span>

                  </label>

                ))}

              </div>

            )}

            <input type="text" placeholder="CPF na nota (Opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full mt-6 border border-zinc-300 rounded-lg p-3 text-sm focus:border-red-600 outline-none transition-all" />

          </div>

        </div>



        {/* LADO DIREITO: RESUMO E UPSELL */}

        <div className="lg:w-[400px]">

          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm sticky top-24 overflow-hidden">

            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50"><h3 className="font-bold text-lg">Resumo do Pedido</h3></div>

           

            <div className="p-6 border-b border-zinc-100 max-h-64 overflow-y-auto custom-scrollbar">

              {itens.map((item: any) => (

                <div key={item.id} className="mb-4 last:mb-0 flex justify-between">

                  <div>

                    <p className="font-medium text-sm pr-2 text-zinc-900"><span className="font-black text-red-600">{item.quantidade}x</span> {item.produto.name}</p>

                    {item.adicionais && item.adicionais.length > 0 && (

                      <p className="text-xs text-zinc-500 mt-0.5 ml-5">+ {item.adicionais.map((a:any) => a.name).join(', ')}</p>

                    )}

                  </div>

                  <p className="font-bold text-sm whitespace-nowrap text-zinc-900">R$ {(item.precoTotal || 0).toFixed(2).replace(".", ",")}</p>

                </div>

              ))}

            </div>



            {/* UPSELL MÁGICO */}

            {sugestoesInteligentes.length > 0 && (

              <div className="p-6 border-b border-zinc-100 bg-orange-50/40">

                <h3 className="font-bold text-xs text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-2">

                  <Zap size={14} className="fill-orange-700"/> O pessoal costuma levar junto:

                </h3>

                <div className="space-y-3">

                  {sugestoesInteligentes.map(prod => (

                    <div key={prod.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-all">

                      <div className="flex-1 pr-3">

                        <p className="font-bold text-sm text-zinc-900 leading-tight">{prod.name}</p>

                        <p className="font-black text-orange-600 text-xs mt-0.5">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>

                      </div>

                      <button onClick={() => adicionarItem(prod, 1, [], "")} className="bg-zinc-900 hover:bg-zinc-800 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 shrink-0">

                        <Plus size={18}/>

                      </button>

                    </div>

                  ))}

                </div>

              </div>

            )}



            <div className="p-6 space-y-3 bg-zinc-50/50">

              <div className="flex justify-between text-sm text-zinc-600"><span>Subtotal dos itens</span><span>R$ {subtotal.toFixed(2).replace(".", ",")}</span></div>

              {cupomAtivo && (

                <div className="flex justify-between text-sm font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg -mx-2 px-2">

                  <span className="flex items-center gap-1"><Ticket size={14}/> Cupom ({cupomAtivo.desconto}%)</span>

                  <span>- R$ {valorDesconto.toFixed(2).replace(".", ",")}</span>

                </div>

              )}

              <div className="flex justify-between text-sm text-zinc-600"><span>Taxa de entrega</span><span>R$ {taxaEntrega.toFixed(2).replace(".", ",")}</span></div>

              <div className="flex justify-between font-black text-2xl pt-4 border-t border-zinc-200">

                <span>Total</span><span className="text-red-600">R$ {totalGeral.toFixed(2).replace(".", ",")}</span>

              </div>

            </div>

           

            <div className="p-6 pt-0 bg-zinc-50/50">

              <button onClick={handleFinalizarPedido} disabled={processando || (tipoEntrega === 'entrega' && !localValido) || itens.length === 0} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-md text-lg transition-colors flex items-center justify-center gap-2 active:scale-95">

                {processando ? <><Loader2 size={20} className="animate-spin"/> Gerando Pedido...</> : (tipoEntrega === 'entrega' && !localValido) ? "Endereço Pendente" : "Finalizar Compra"}

              </button>

            </div>

          </div>

        </div>



      </div>

    </div>

  );

}