// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { supabase } from "../lib/supabase";
import { 
  MapPin, Store, CreditCard, Banknote, ShieldCheck, Ticket, 
  AlertCircle, CheckCircle2, Loader2, X, Plus, Zap, Image as ImageIcon, Crosshair
} from "lucide-react";

// Fórmula Haversine para calcular a distância
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { itens, subtotal, totalCarrinho, cupomAtivo, setCupomAtivo, valorDesconto, adicionarItem, dispararEventoRadar, enderecoDetectado } = useCart();
  
  useEffect(() => {
    if (dispararEventoRadar) dispararEventoRadar('checkout', 'Iniciou o Checkout');
  }, []);
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [cliente, setCliente] = useState<any>(null);
  
  const [dadosLoja, setDadosLoja] = useState<any>(null);
  const [tipoEntrega, setTipoEntrega] = useState<"entrega" | "retirada">("entrega");
  const [metodoSelecionado, setMetodoSelecionado] = useState("Dinheiro");
  const [precisaTroco, setPrecisaTroco] = useState("");
  const [cpf, setCpf] = useState("");
  const [processando, setProcessando] = useState(false);
  
  const [enderecoAtivo, setEnderecoAtivo] = useState("");
  const [modoEndereco, setModoEndereco] = useState<"padrao" | "gps" | "novo">("novo");
  const [salvarNovoEndereco, setSalvarNovoEndereco] = useState(true); // NOVO: Controle de atualização de endereço

  // Estados do Formulário Manual
  const [novoCep, setNewCep] = useState(""); 
  const [novaRua, setNewRua] = useState(""); 
  const [novoNumero, setNewNumero] = useState(""); 
  const [novoBairro, setNewBairro] = useState(""); 
  const [novaCidade, setNewCidade] = useState(""); 
  const [novoUf, setNewUf] = useState(""); 
  const [novoComplemento, setNewComplemento] = useState("");

  const [buscandoCep, setBuscandoCep] = useState(false); 
  const [cepGenerico, setCepGenerico] = useState(false); 

  // Estados do Formulário GPS
  const [ruaGps, setRuaGps] = useState("");
  const [bairroGps, setBairroGps] = useState("");
  const [numeroGps, setNumeroGps] = useState("");
  const [complementoGps, setComplementoGps] = useState("");
  const [cidadeGps, setCidadeGps] = useState("");
  const [ufGps, setUfGps] = useState("");
  const [cepGps, setCepGps] = useState("");

  const [verificandoLocal, setVerificandoLocal] = useState(false);
  const [localValido, setLocalValido] = useState(false);
  const [distanciaReal, setDistanciaReal] = useState<number | null>(null);
  const [erroMapa, setErroMapa] = useState("Preencha o endereço para validar a entrega.");
  const [freteCalculado, setFreteCalculado] = useState<number | null>(null);
  const [coordenadasCliente, setCoordenadasCliente] = useState<{lat: number, lng: number} | null>(null); // Para salvar no Cache
  
  const [sugestoesInteligentes, setSugestoesInteligentes] = useState<any[]>([]);

  const salvarNoCRM = async (nome: string, telefoneLimpo: string, endereco: string, atualizarEndereco: boolean) => {
    try {
      const tenantId = itens[0].produto.tenant_id;
      const { data: existente } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).eq("phone", telefoneLimpo).maybeSingle();
      
      let dadosAtualizar: any = { name: nome, updated_at: new Date() };
      if (atualizarEndereco) dadosAtualizar.address = endereco; // Só atualiza se ele marcou o checkbox

      if (existente) {
        const { data: atualizado } = await supabase.from("customers").update(dadosAtualizar).eq("id", existente.id).select().single();
        if (atualizado) { setCliente(atualizado); localStorage.setItem("@saas_customer", JSON.stringify(atualizado)); }
      } else {
        const { data: novo } = await supabase.from("customers").insert([{ tenant_id: tenantId, name: nome, phone: telefoneLimpo, address: endereco }]).select().single();
        if (novo) { setCliente(novo); localStorage.setItem("@saas_customer", JSON.stringify(novo)); }
      }
    } catch (e) { console.error("Erro CRM:", e); }
  };

  const calcularFreteEZonas = (latC: number, lngC: number, lojaConfig: any) => {
    if (!lojaConfig.lat || !lojaConfig.lng) {
      setLocalValido(false); setErroMapa("Loja sem coordenadas configuradas."); return;
    }

    const distLoja = calcularDistanciaKm(lojaConfig.lat, lojaConfig.lng, latC, lngC);
    setDistanciaReal(distLoja);

    let zonaEncontrada = null;
    if (lojaConfig.delivery_zones && lojaConfig.delivery_zones.length > 0) {
      for (const zona of lojaConfig.delivery_zones) {
        const distZ = calcularDistanciaKm(zona.lat, zona.lng, latC, lngC);
        if (distZ <= zona.raio) { zonaEncontrada = zona; break; }
      }
    }

    if (zonaEncontrada) {
      setFreteCalculado(zonaEncontrada.taxa);
      setLocalValido(true);
      setErroMapa(`Zona detectada: ${zonaEncontrada.nome}`);
    } else if (distLoja <= (lojaConfig.delivery_radius_km || 10)) {
      setFreteCalculado(lojaConfig.base_delivery_fee);
      setLocalValido(true);
      setErroMapa(""); 
    } else {
      setFreteCalculado(null);
      setLocalValido(false);
      // MENSAGEM LIMPA, SEM MOSTRAR KM PRO CLIENTE
      setErroMapa(`Desculpe, este endereço está fora da nossa área de entrega.`); 
    }
  };

  useEffect(() => {
    if (enderecoDetectado) {
      setRuaGps(enderecoDetectado.rua || ""); setBairroGps(enderecoDetectado.bairro || "");
      setCidadeGps(enderecoDetectado.cidade || ""); setUfGps(enderecoDetectado.uf || "");
      setCepGps(enderecoDetectado.cep || "");
      
      setNewCep(enderecoDetectado.cep || ""); setNewRua(enderecoDetectado.rua || "");
      setNewBairro(enderecoDetectado.bairro || ""); setNewCidade(enderecoDetectado.cidade || "");
      setNewUf(enderecoDetectado.uf || "");
    }
  }, [enderecoDetectado]);

  useEffect(() => {
    if (modoEndereco === "gps" && dadosLoja) {
      const locSalva = JSON.parse(sessionStorage.getItem('@saas_loc') || 'null');
      if (locSalva && locSalva.lat) {
        calcularFreteEZonas(locSalva.lat, locSalva.lng, dadosLoja);
        setCoordenadasCliente({ lat: locSalva.lat, lng: locSalva.lng });
      }
      
      if (!numeroGps.trim() || !ruaGps.trim()) {
        setLocalValido(false);
        setErroMapa("Por favor, revise o nome da rua e digite o número.");
      } 
    }
  }, [numeroGps, ruaGps, bairroGps, modoEndereco, dadosLoja]);

  // MOTOR COM O NOSSO BANCO DE DADOS DE CACHE INCLUSO
  const buscarLocalERecalcular = async (enderecoStr: string, lojaConfig: any, cepAlvo?: string) => {
    setVerificandoLocal(true);
    setErroMapa(""); setLocalValido(false); setFreteCalculado(null);
    
    try {
      const cepBusca = cepAlvo || enderecoStr.match(/CEP:\s*(\d+)/)?.[1] || enderecoStr.match(/(\d{8})/)?.[1];
      
      // 1. TENTA ACHAR NO SEU BANCO DE DADOS PRIMEIRO (Super Rápido e Sem Custo)
      if (cepBusca) {
        const { data: cache } = await supabase.from('address_cache').select('*').eq('cep', cepBusca).maybeSingle();
        if (cache && cache.lat && cache.lng) {
           calcularFreteEZonas(cache.lat, cache.lng, lojaConfig);
           setCoordenadasCliente({ lat: cache.lat, lng: cache.lng });
           setVerificandoLocal(false);
           return; // Interrompe aqui, não precisa ir pro satélite!
        }
      }

      // 2. SE NÃO ESTIVER NO BANCO, VAI PRO SATÉLITE
      const fetchGeo = async (query: string) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&email=suporte@nexusdelivery.com&addressdetails=1&limit=1`;
          const res = await fetch(url);
          if (!res.ok) return [];
          return await res.json();
        } catch (e) { return []; }
      };

      let latC = null, lngC = null;
      let geoCliente = [];

      if (cepBusca) { 
        geoCliente = await fetchGeo(`${cepBusca}, Brasil`);
        if (geoCliente.length === 0) {
          const resViaCep = await fetch(`https://viacep.com.br/ws/${cepBusca}/json/`);
          const dataViaCep = await resViaCep.json();
          if (!dataViaCep.erro) {
             if (dataViaCep.logradouro) geoCliente = await fetchGeo(`${dataViaCep.logradouro}, ${dataViaCep.localidade}, Brasil`);
             if (geoCliente.length === 0 && dataViaCep.bairro) geoCliente = await fetchGeo(`${dataViaCep.bairro}, ${dataViaCep.localidade}, Brasil`);
             if (geoCliente.length === 0) geoCliente = await fetchGeo(`${dataViaCep.localidade}, Brasil`);
          }
        }
      }

      if (geoCliente.length === 0 && novaRua && novaCidade) {
        geoCliente = await fetchGeo(`${novaRua}, ${novaCidade}, Brasil`);
      }

      if (geoCliente.length > 0) {
        latC = parseFloat(geoCliente[0].lat);
        lngC = parseFloat(geoCliente[0].lon);
      } 

      if (latC && lngC) {
        setCoordenadasCliente({ lat: latC, lng: lngC });
        calcularFreteEZonas(latC, lngC, lojaConfig);
      } else { 
        setLocalValido(false); setErroMapa("Não conseguimos validar a distância. Revise o endereço."); 
      }
    } catch (e) { 
      setLocalValido(false); setErroMapa("Instabilidade ao verificar distância."); 
    }
    setVerificandoLocal(false);
  };

  useEffect(() => {
    if (modoEndereco === "novo" && novoCep && novaRua && novoBairro && novaCidade && dadosLoja) {
      const timer = setTimeout(() => {
        const endStr = `${novaRua}, ${novoNumero}, ${novoBairro}, ${novaCidade} - ${novoUf} | CEP: ${novoCep}`;
        buscarLocalERecalcular(endStr, dadosLoja, novoCep);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (modoEndereco === "novo") {
      setLocalValido(false);
      setErroMapa("Preencha todos os campos obrigatórios (*).");
    }
  }, [novoCep, novaRua, novoNumero, novoBairro, novaCidade, modoEndereco, dadosLoja]);

  useEffect(() => {
    if (modoEndereco === "padrao" && cliente?.address && dadosLoja) {
      buscarLocalERecalcular(cliente.address, dadosLoja);
    }
  }, [modoEndereco, cliente, dadosLoja]);

  useEffect(() => {
    const c = localStorage.getItem("@saas_customer");
    const clienteSalvo = c ? JSON.parse(c) : null;
    
    async function iniciar() {
      if (itens.length === 0 || !itens[0]?.produto?.tenant_id) return;
      const { data } = await supabase.from("tenants").select("whatsapp, zip_code, delivery_radius_km, base_delivery_fee, lat, lng, delivery_zones").eq("id", itens[0].produto.tenant_id).single();
      if (data) setDadosLoja(data); 

      const locSalva = sessionStorage.getItem('@saas_loc');
      
      if (clienteSalvo && clienteSalvo.address) { 
        setCliente(clienteSalvo);
        setNomeCliente(clienteSalvo.name && clienteSalvo.name !== "Cliente Visitante" ? clienteSalvo.name : "");
        setTelefoneCliente(clienteSalvo.phone && clienteSalvo.phone !== "Não informado" ? clienteSalvo.phone : "");
        setModoEndereco("padrao"); 
      } else if (enderecoDetectado && locSalva) {
        setModoEndereco("gps");
      } else {
        setModoEndereco("novo");
      }
    }
    iniciar();
  }, [enderecoDetectado]);

  const buscarCepGenerico = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, '');
    setNewCep(cepLimpo);
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    
    // Verifica primeiro se tem no Cache pra economizar tempo
    const { data: cache } = await supabase.from('address_cache').select('*').eq('cep', cepLimpo).maybeSingle();
    if (cache) {
       setNewCidade(cache.cidade); setNewUf(cache.uf);
       if (cache.rua) { setCepGenerico(false); setNewRua(cache.rua); setNewBairro(cache.bairro); } 
       else { setCepGenerico(true); setNewRua(""); setNewBairro(""); }
       setBuscandoCep(false);
       return;
    }

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`); const data = await res.json();
      if (!data.erro) {
        setNewCidade(data.localidade); setNewUf(data.uf); 
        if (!data.logradouro) { setCepGenerico(true); setNewRua(""); setNewBairro(""); } 
        else { setCepGenerico(false); setNewRua(data.logradouro); setNewBairro(data.bairro); }
      }
    } catch (error) {} finally { setBuscandoCep(false); }
  };

  const alternarModoEndereco = (modo: "padrao" | "gps" | "novo") => { 
    setModoEndereco(modo); 
    setErroMapa(""); setLocalValido(false);
    if (modo === "padrao" && cliente?.address) buscarLocalERecalcular(cliente.address, dadosLoja); 
    else if (modo === "gps" && enderecoDetectado) setNumeroGps("");
  };

  const taxaEntrega = tipoEntrega === "entrega" ? (freteCalculado !== null ? freteCalculado : (dadosLoja?.base_delivery_fee || 0)) : 0;
  const totalGeral = totalCarrinho + taxaEntrega;

  let statusBotao = "Finalizar Compra";
  let classeBotao = "bg-red-600 hover:bg-red-700 text-white";
  let bloqueado = false;

  if (processando) {
    statusBotao = "Gerando Pedido..."; bloqueado = true;
  } else if (itens.length === 0) {
    statusBotao = "Carrinho Vazio"; bloqueado = true; classeBotao = "bg-zinc-300 text-zinc-500";
  } else if (tipoEntrega === 'entrega') {
    if (verificandoLocal) {
      statusBotao = "Verificando Endereço..."; bloqueado = true; classeBotao = "bg-amber-500 text-white";
    } else if (!localValido) {
      statusBotao = "Fora da Área de Entrega"; bloqueado = true; classeBotao = "bg-zinc-300 text-zinc-500";
    }
  }

  const handleFinalizarPedido = async () => {
    if (!nomeCliente.trim() || !telefoneCliente.trim()) return alert("Por favor, preencha seu Nome e WhatsApp.");
    if (!dadosLoja?.whatsapp) return alert("A loja não possui WhatsApp configurado.");

    setProcessando(true);
    try {
      const tenantId = itens[0].produto.tenant_id;
      const telefoneLimpo = telefoneCliente.replace(/\D/g, ''); 

      let enderecoFinal = "Retirada no Balcão";
      if (tipoEntrega === "entrega") {
        if (modoEndereco === "gps") {
          enderecoFinal = `${ruaGps}, ${numeroGps}, ${bairroGps}, ${cidadeGps} - ${ufGps} | CEP: ${cepGps} ${complementoGps ? '| Compl: ' + complementoGps : ''}`;
        } else if (modoEndereco === "novo") {
          enderecoFinal = `${novaRua}, ${novoNumero}, ${novoBairro}, ${novaCidade} - ${novoUf} | CEP: ${novoCep} ${novoComplemento ? '| Compl: ' + novoComplemento : ''}`;
        } else {
          enderecoFinal = cliente.address;
        }
      }

      if (cupomAtivo && cupomAtivo.first_purchase_only) {
         const { data: historico } = await supabase.from('orders').select('id').eq('tenant_id', tenantId).eq('customer_phone', telefoneLimpo).limit(1);
         if (historico && historico.length > 0) {
            alert(`🚫 O cupom ${cupomAtivo.codigo} é exclusivo para a PRIMEIRA compra na loja.`);
            setCupomAtivo(null); setProcessando(false); return; 
         }
      }
      
      let metodoFinal = `Na Entrega: ${metodoSelecionado}`;
      if (metodoSelecionado === "Dinheiro" && precisaTroco.trim() !== "") metodoFinal += ` (Troco para R$ ${precisaTroco})`;

      // Atualiza o CRM (Só salva endereço novo se a caixa estiver marcada)
      const atualizarEnd = modoEndereco !== "padrao" ? salvarNovoEndereco : false;
      await salvarNoCRM(nomeCliente, telefoneLimpo, enderecoFinal, atualizarEnd);

      // ALIMENTA O NOSSO CACHE DE ENDEREÇOS PARA DEIXAR O APP MAIS RÁPIDO NO FUTURO
      if (tipoEntrega === "entrega" && coordenadasCliente && localValido) {
         const cepParaSalvar = modoEndereco === "gps" ? cepGps : novoCep;
         if (cepParaSalvar) {
           await supabase.from('address_cache').upsert({
             cep: cepParaSalvar.replace(/\D/g, ''),
             rua: modoEndereco === "gps" ? ruaGps : novaRua,
             bairro: modoEndereco === "gps" ? bairroGps : novoBairro,
             cidade: modoEndereco === "gps" ? cidadeGps : novaCidade,
             uf: modoEndereco === "gps" ? ufGps : novoUf,
             lat: coordenadasCliente.lat,
             lng: coordenadasCliente.lng
           }, { onConflict: 'cep' }).select();
         }
      }

      const { data: pedidoSalvo, error } = await supabase.from("orders").insert([{ 
        tenant_id: tenantId, customer_name: nomeCliente, customer_phone: telefoneLimpo, 
        customer_address: enderecoFinal, payment_method: metodoFinal, total_amount: totalGeral, status: 'pendente' 
      }]).select().single();
      if (error) throw error;

      const itensParaSalvar = itens.map((item: any) => {
        let textoOpcoes = "";
        if (item.variacao) textoOpcoes += `Sabor/Opção: ${item.variacao}\n`;
        if (item.adicionais && item.adicionais.length > 0) textoOpcoes += "Adicionais:\n" + item.adicionais.map((add: any) => `- ${add.name}`).join("\n") + "\n";
        if (item.observacao) textoOpcoes += "Obs: " + item.observacao;
        if (cpf) textoOpcoes += `\nCPF na Nota: ${cpf}`;
        return { order_id: pedidoSalvo.id, product_name: item.produto.name, quantity: item.quantidade, unit_price: item.produto.price, options_text: textoOpcoes.trim() };
      });
      await supabase.from("order_items").insert(itensParaSalvar);

      if (typeof window !== "undefined" && window.fbq) {
        window.fbq('track', 'Purchase', { value: totalGeral, currency: 'BRL', content_ids: itens.map((i: any) => i.produto.id), content_type: 'product', num_items: itens.length });
      }
      if (dispararEventoRadar) dispararEventoRadar('purchase', 'Venda realizada pelo WhatsApp!', totalGeral);

      let textoPedido = `*NOVO PEDIDO!* 🚀\n*ID:* #${pedidoSalvo.id.split('-')[0].toUpperCase()}\n\n*Cliente:* ${nomeCliente}\n*Contato:* ${telefoneCliente}\n*Tipo:* ${tipoEntrega === 'entrega' ? '🛵 Entrega' : '🏃‍♂️ Retirada'}\n`;
      if (tipoEntrega === 'entrega') { textoPedido += `*Endereço:* ${enderecoFinal}\n`; }
      textoPedido += `*Pagamento:* ${metodoFinal}\n\n*🛒 ITENS:*\n`;
      
      itens.forEach((item: any) => { 
        textoPedido += `${item.quantidade}x ${item.produto.name}`;
        if (item.variacao) textoPedido += ` *(Sabor: ${item.variacao})*`;
        textoPedido += ` (R$ ${(item.precoTotal || 0).toFixed(2).replace('.', ',')})\n`; 
      });
      
      textoPedido += `\nSubtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
      if (cupomAtivo) textoPedido += `\nDesconto (${cupomAtivo.desconto}%): - R$ ${valorDesconto.toFixed(2).replace(".", ",")}`;
      if (taxaEntrega > 0) textoPedido += `\nTaxa: R$ ${taxaEntrega.toFixed(2).replace(".", ",")}`;
      textoPedido += `\n*💰 TOTAL: R$ ${totalGeral.toFixed(2).replace(".", ",")}*`;

      const wpp = dadosLoja.whatsapp.replace(/\D/g, ''); 
      window.open(`https://wa.me/${wpp.startsWith('55') ? wpp : `55${wpp}`}?text=${encodeURIComponent(textoPedido)}`, "_blank");
      onClose();
    } catch (e: any) { alert("Erro ao gerar pedido: " + e.message); } finally { setProcessando(false); }
  };

  useEffect(() => {
    const gerarRecomendacoes = async () => {
      if (itens.length === 0 || !itens[0]?.produto?.tenant_id) return;
      try {
        const tId = itens[0].produto.tenant_id;
        const idsNoC = itens.map((i: any) => i.produto.id);
        const nomesNoC = itens.map((i: any) => i.produto.name.toLowerCase());
        const { data: prodsDB } = await supabase.from("products").select("upsell_item_ids").in("id", idsNoC);
        
        const idsSugeridos = new Set<string>();
        if (prodsDB) {
          prodsDB.forEach(p => {
            let ups = p.upsell_item_ids;
            if (typeof ups === 'string') try { ups = JSON.parse(ups); } catch (e) { ups = []; }
            if (Array.isArray(ups)) ups.forEach((u: string) => idsSugeridos.add(u));
          });
        }
        idsNoC.forEach(id => idsSugeridos.delete(id));

        let upsells = [];
        if (idsSugeridos.size > 0) {
          const { data: esp } = await supabase.from("products").select("*").in("id", Array.from(idsSugeridos)).eq("active", true);
          if (esp) upsells = esp;
        }
        if (upsells.length === 0) {
          const { data: glob } = await supabase.from("products").select("*").eq("tenant_id", tId).eq("is_upsell", true).eq("active", true);
          if (glob) upsells = glob;
        }
        setSugestoesInteligentes(upsells.filter(p => !nomesNoC.includes(p.name.toLowerCase())).slice(0, 3));
      } catch (error) {}
    };
    gerarRecomendacoes();
  }, [itens]);

  return (
    <div className="fixed inset-0 z-[300] bg-zinc-50 overflow-y-auto animate-in fade-in text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-red-600 font-black text-2xl flex items-center gap-2"><ShieldCheck size={28} /> Checkout Seguro</div>
          <button onClick={onClose} className="text-zinc-500 font-bold hover:text-red-600 transition-colors">Voltar à Sacola</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-10">
        
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Seus Dados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Nome Completo *</label>
                <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Seu nome" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">WhatsApp *</label>
                <input type="tel" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} placeholder="(DD) 99999-9999" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-6 pt-4">Detalhes da Entrega</h1>
          <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-sm flex gap-2">
            <button onClick={() => setTipoEntrega("entrega")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${tipoEntrega === "entrega" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500 hover:bg-zinc-50"}`}><MapPin size={18} /> Receber em Casa</button>
            <button onClick={() => setTipoEntrega("retirada")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${tipoEntrega === "retirada" ? "bg-red-50 text-red-600 border border-red-200" : "text-zinc-500 hover:bg-zinc-50"}`}><Store size={18} /> Retirar no Balcão</button>
          </div>
          
          {tipoEntrega === "entrega" && (
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm animate-in fade-in">
              <h2 className="font-bold text-lg mb-4">Onde vamos entregar?</h2>
              <div className="space-y-4">
                
                {cliente?.address && (
                  <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${modoEndereco === "padrao" ? "border-red-600 bg-red-50/30" : "border-zinc-200 hover:border-red-300"}`}>
                    <input type="radio" checked={modoEndereco === "padrao"} onChange={() => alternarModoEndereco("padrao")} className="mt-1 w-4 h-4 accent-red-600" />
                    <div className="flex-1 w-full">
                      <p className="font-bold text-zinc-900">Meu Endereço Salvo</p>
                      <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{cliente.address}</p>
                    </div>
                  </label>
                )}

                {enderecoDetectado && (
                  <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${modoEndereco === "gps" ? "border-red-600 bg-red-50/30" : "border-zinc-200 hover:border-red-300"}`}>
                    <input type="radio" checked={modoEndereco === "gps"} onChange={() => alternarModoEndereco("gps")} className="mt-1 w-4 h-4 accent-red-600" />
                    <div className="flex-1 w-full">
                      <p className="font-bold text-zinc-900 flex items-center gap-2"><Crosshair size={16} className="text-red-600"/> Usar Localização Atual (GPS)</p>
                      <p className="text-sm text-zinc-600 mt-1 leading-relaxed">Taxa de entrega calculada pelo GPS do celular. Confirme os dados:</p>

                      {modoEndereco === "gps" && (
                         <div className="mt-4 pt-4 border-t border-red-100 flex flex-col gap-3 animate-in fade-in" onClick={e => e.preventDefault()}>
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Rua / Logradouro *</label>
                                <input type="text" value={ruaGps} onChange={e => setRuaGps(e.target.value)} className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold" />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Nº *</label>
                                <input type="text" value={numeroGps} onChange={e => setNumeroGps(e.target.value)} className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Bairro *</label>
                                <input type="text" value={bairroGps} onChange={e => setBairroGps(e.target.value)} className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none font-bold" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Complemento</label>
                                <input type="text" value={complementoGps} onChange={e => setComplementoGps(e.target.value)} placeholder="Apt, Casa" className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                              <input type="checkbox" checked={salvarNovoEndereco} onChange={e => setSalvarNovoEndereco(e.target.checked)} className="accent-red-600 w-4 h-4" />
                              <span className="text-sm font-bold text-zinc-700">Salvar como meu endereço padrão</span>
                            </label>
                         </div>
                      )}
                    </div>
                  </label>
                )}

                <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${modoEndereco === "novo" ? "border-red-600 bg-red-50/30" : "border-zinc-200 hover:border-red-300"}`}>
                  <input type="radio" checked={modoEndereco === "novo"} onChange={() => alternarModoEndereco("novo")} className="mt-1 w-4 h-4 accent-red-600" />
                  <div className="flex-1 w-full">
                    <p className="font-bold text-zinc-900">Entregar em outro local</p>
                    {modoEndereco === "novo" && (
                      <div className="mt-4 space-y-4 animate-in fade-in" onClick={e => e.preventDefault()}>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-1">
                            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                              CEP * {buscandoCep && <Loader2 size={12} className="animate-spin text-red-600"/>}
                            </label>
                            <input type="text" maxLength={8} value={novoCep} onChange={(e) => buscarCepGenerico(e.target.value)} placeholder="00000000" className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                          </div>
                          <div className="col-span-2"><label className="block text-xs font-bold text-zinc-700 mb-1">Cidade / UF</label><input type="text" value={novaCidade ? `${novaCidade} - ${novoUf}` : ""} disabled className="w-full border border-zinc-200 bg-zinc-100 rounded-lg p-2.5 text-sm text-zinc-500" /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="col-span-3"><label className="block text-xs font-bold text-zinc-700 mb-1">Rua *</label><input type="text" value={novaRua} onChange={(e) => setNewRua(e.target.value)} disabled={!cepGenerico && !!novaRua} className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!novaRua) ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-white border-zinc-300 focus:ring-2 focus:ring-red-600'}`} /></div>
                          <div className="col-span-1"><label className="block text-xs font-bold text-zinc-700 mb-1">Nº *</label><input type="text" value={novoNumero} onChange={(e) => setNewNumero(e.target.value)} className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-bold text-zinc-700 mb-1">Bairro *</label><input type="text" value={novoBairro} onChange={(e) => setNewBairro(e.target.value)} disabled={!cepGenerico && !!novoBairro} className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!novoBairro) ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-white border-zinc-300 focus:ring-2 focus:ring-red-600'}`} /></div>
                          <div><label className="block text-xs font-bold text-zinc-700 mb-1">Complemento</label><input type="text" value={novoComplemento} onChange={(e) => setNewComplemento(e.target.value)} placeholder="Apt, Casa" className="w-full border border-zinc-300 bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none" /></div>
                        </div>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer border-t border-zinc-100 pt-4">
                          <input type="checkbox" checked={salvarNovoEndereco} onChange={e => setSalvarNovoEndereco(e.target.checked)} className="accent-red-600 w-4 h-4" />
                          <span className="text-sm font-bold text-zinc-700">Salvar como meu endereço padrão</span>
                        </label>
                      </div>
                    )}
                  </div>
                </label>

                {/* MENSAGENS DE STATUS SILENCIOSAS */}
                <div className="mt-4 animate-in fade-in">
                  {verificandoLocal ? (
                    <p className="text-sm text-amber-600 font-bold flex items-center p-4 bg-amber-50 rounded-xl border border-amber-200 gap-2"><Loader2 size={16} className="animate-spin"/> Calculando área e taxas logísticas...</p>
                  ) : erroMapa.includes("Zona detectada") ? (
                    <p className="text-sm text-emerald-600 font-bold flex items-center p-4 bg-emerald-50 rounded-xl border border-emerald-200 gap-2"><CheckCircle2 size={18}/> {erroMapa}</p>
                  ) : erroMapa ? (
                    <p className="text-sm text-red-600 font-bold flex items-center p-4 bg-red-50 rounded-xl border border-red-200 gap-2 leading-tight"><AlertCircle size={18} className="shrink-0"/> {erroMapa}</p>
                  ) : localValido ? (
                    <p className="text-sm text-emerald-600 font-bold flex items-center p-4 bg-emerald-50 rounded-xl border border-emerald-200 gap-2"><CheckCircle2 size={18}/> Endereço aprovado para entrega!</p>
                  ) : null}
                </div>

              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Forma de Pagamento</h2>
            <div className="flex gap-4 mb-6">
              <button className={`flex-1 py-2 font-bold text-sm border-b-2 border-red-600 text-red-600 transition-colors flex justify-center items-center gap-2`}><Banknote size={18}/> Pagar na Entrega</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Vale Refeição"].map(metodo => (
                <label key={metodo} className={`flex items-center gap-3 border p-4 rounded-xl cursor-pointer transition-all ${metodoSelecionado === metodo ? "border-red-600 bg-red-50 shadow-sm" : "border-zinc-200 hover:bg-zinc-50"}`}>
                  <input type="radio" checked={metodoSelecionado === metodo} onChange={() => setMetodoSelecionado(metodo)} className="w-4 h-4 accent-red-600" /><span className="font-medium text-sm text-zinc-800">{metodo}</span>
                </label>
              ))}
            </div>
            {metodoSelecionado === "Dinheiro" && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-zinc-800 mb-2">Precisa de troco?</label>
                <input type="text" placeholder="Ex: Troco para R$ 100,00 ou deixe em branco" value={precisaTroco} onChange={(e) => setPrecisaTroco(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:border-red-600 outline-none transition-all" />
              </div>
            )}
            <input type="text" placeholder="CPF na nota (Opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full mt-6 border border-zinc-300 rounded-lg p-3 text-sm focus:border-red-600 outline-none transition-all" />
          </div>
        </div>

        <div className="lg:w-[400px]">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm sticky top-24 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50"><h3 className="font-bold text-lg">Resumo do Pedido</h3></div>
            <div className="p-6 border-b border-zinc-100 max-h-64 overflow-y-auto custom-scrollbar">
              {itens.map((item: any) => (
                <div key={item.id} className="mb-4 last:mb-0 flex justify-between">
                  <div>
                    <p className="font-medium text-sm pr-2 text-zinc-900"><span className="font-black text-red-600">{item.quantidade}x</span> {item.produto.name}</p>
                    {item.variacao && <p className="text-xs font-bold text-indigo-600 mt-0.5 ml-5">Sabor: {item.variacao}</p>}
                    {item.adicionais && item.adicionais.length > 0 && <p className="text-xs text-zinc-500 mt-0.5 ml-5">+ {item.adicionais.map((a:any) => a.name).join(', ')}</p>}
                  </div>
                  <p className="font-bold text-sm whitespace-nowrap text-zinc-900">R$ {(item.precoTotal || 0).toFixed(2).replace(".", ",")}</p>
                </div>
              ))}
            </div>

            {sugestoesInteligentes.length > 0 && (
              <div className="p-6 border-b border-zinc-100 bg-orange-50/40 animate-in fade-in">
                <h3 className="font-bold text-xs text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap size={14} className="fill-orange-700"/> Leve também:</h3>
                <div className="space-y-3">
                  {sugestoesInteligentes.map(prod => (
                    <div key={prod.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
                      <div className="w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
                        {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-400"><ImageIcon size={20}/></div>}
                      </div>
                      <div className="flex-1 pr-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-900 leading-tight truncate">{prod.name}</p>
                        <p className="font-black text-orange-600 text-xs mt-0.5">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <button onClick={() => adicionarItem(prod, 1, [], "")} className="bg-zinc-900 hover:bg-zinc-800 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 shrink-0"><Plus size={18}/></button>
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
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Taxa de entrega</span>
                <span>{taxaEntrega === 0 && tipoEntrega === "entrega" && !freteCalculado ? "Calculando..." : `R$ ${taxaEntrega.toFixed(2).replace(".", ",")}`}</span>
              </div>
              <div className="flex justify-between font-black text-2xl pt-4 border-t border-zinc-200">
                <span>Total</span><span className="text-red-600">R$ {totalGeral.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
            
            <div className="p-6 pt-0 bg-zinc-50/50">
              <button onClick={handleFinalizarPedido} disabled={bloqueado} className={`w-full font-black py-4 rounded-xl shadow-md text-lg transition-colors flex items-center justify-center gap-2 active:scale-95 ${classeBotao}`}>
                {processando ? <Loader2 size={20} className="animate-spin"/> : null}
                {statusBotao}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}