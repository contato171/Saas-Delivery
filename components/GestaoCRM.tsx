// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import dynamic from 'next/dynamic';
import { 
  Users, BrainCircuit, Zap, Search, Plus, DollarSign, 
  AlertCircle, Award, Clock, Tag, CheckCircle2, XCircle, 
  TrendingUp, Play, Pause, CalendarDays, Moon, Edit, Sun, Map
} from "lucide-react";

// Mapa dinâmico
const MapaCalorReal = dynamic(() => import('./MapaCalor'), { 
  ssr: false, 
  loading: () => <div className="w-full h-80 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200"><span className="animate-pulse text-zinc-500 font-bold flex items-center gap-2"><Map size={20}/> Conectando satélite...</span></div> 
});

export default function GestaoCRM({ tenantId }: { tenantId: string }) {
  const [abaCrm, setAbaCrm] = useState("rfm");
  const [clientesProcessados, setClientesProcessados] = useState<any[]>([]);
  const [automacoes, setAutomacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState("");

  const [centroMapa, setCentroMapa] = useState<[number, number]>([-15.7906, -47.8916]);
  const [mapaCalorDados, setMapaCalorDados] = useState<any[]>([]);
  const [segmentos, setSegmentos] = useState({
    vips: 0, risco: 0, perdidos: 0, recemChegados: 0, 
    fimDeSemana: 0, notivagos: 0, almoco: 0, topProduto: "", dinheiroDeixadoNaMesa: 0
  });

  const [modalAutomacao, setModalAutomacao] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [autoNome, setAutoNome] = useState("");
  const [autoGatilho, setAutoGatilho] = useState("Sextas as 18h");
  const [autoSegmento, setAutoSegmento] = useState("Risco");
  const [autoMsg, setAutoMsg] = useState("Olá {{nome_cliente}}! Sentimos a sua falta. Pegue 15% OFF com o cupom VOLTA15.");
  const [autoCupomCod, setAutoCupomCod] = useState("VOLTA15");
  const [autoCupomDesc, setAutoCupomDesc] = useState(15);
  const [salvandoAuto, setSalvandoAuto] = useState(false);

  // MOTOR DE EXTRAÇÃO CIRÚRGICO
  const extrairDadosEndereco = (endereco: string) => {
    try {
      const strLimpa = endereco.split('|')[0]; // Tira CEP e Compl
      const partes = strLimpa.split(',');
      if (partes.length >= 3) {
        return {
          rua: partes[0].trim(),
          bairro: partes[2].trim(),
          cidade: partes.length >= 4 ? partes[3].split('-')[0].trim() : ""
        };
      }
    } catch (e) {}
    return { rua: "", bairro: "Centro", cidade: "" };
  };

  const carregarDadosInteligentes = async () => {
    setLoading(true);
    
    const { data: lojaConfig } = await supabase.from("tenants").select("zip_code").eq("id", tenantId).single();
    const { data: cData } = await supabase.from("customers").select("*").eq("tenant_id", tenantId);
    const { data: oData } = await supabase.from("orders").select("*, order_items(*)").eq("tenant_id", tenantId);
    const { data: aData } = await supabase.from("automations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    
    if (aData) setAutomacoes(aData);

    let cidadeLoja = "";
    let centroAtual: [number, number] = [-15.7906, -47.8916];

    if (lojaConfig?.zip_code) {
      try {
        const resLocal = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${lojaConfig.zip_code}, Brasil`);
        const geoLocal = await resLocal.json();
        if (geoLocal.length > 0) {
          centroAtual = [parseFloat(geoLocal[0].lat), parseFloat(geoLocal[0].lon)];
          cidadeLoja = geoLocal[0].address?.city || geoLocal[0].address?.town || geoLocal[0].address?.municipality || "";
          setCentroMapa(centroAtual);
        }
      } catch (e) {}
    }

    if (cData && oData) {
      let stats = { vips: 0, risco: 0, perdidos: 0, recemChegados: 0, fimDeSemana: 0, notivagos: 0, almoco: 0, topProduto: "", dinheiroDeixadoNaMesa: 0 };
      let contagemProdutos: Record<string, number> = {};
      let bairrosAgrupados: Record<string, { count: number, sampleRua: string, cidade: string }> = {};
      
      const limiteDiasCalor = new Date();
      limiteDiasCalor.setDate(limiteDiasCalor.getDate() - 30);

      const clientesComRFM = cData.map(cliente => {
        const pedidosDoCliente = oData.filter(o => o.customer_name === cliente.name && o.status !== 'cancelado' && o.status !== 'excluido');
        const numPedidos = pedidosDoCliente.length;
        const totalGasto = pedidosDoCliente.reduce((acc, p) => acc + Number(p.total_amount), 0);
        const ticketMedio = numPedidos > 0 ? (totalGasto / numPedidos) : 0;
        
        const ultimoPedido = numPedidos > 0 ? new Date(Math.max(...pedidosDoCliente.map(p => new Date(p.created_at).getTime()))) : new Date(cliente.created_at);
        const diasSemComprar = Math.floor((new Date().getTime() - ultimoPedido.getTime()) / (1000 * 3600 * 24));

        let perfil = "Regular";
        if (numPedidos === 1 && diasSemComprar <= 15) { perfil = "Recém-Chegado"; stats.recemChegados++; } 
        else if (numPedidos >= 3 && diasSemComprar <= 15) { perfil = "VIP"; stats.vips++; } 
        else if (numPedidos >= 2 && diasSemComprar > 15 && diasSemComprar <= 45) { perfil = "Risco"; stats.risco++; stats.dinheiroDeixadoNaMesa += ticketMedio; } 
        else if (numPedidos >= 1 && diasSemComprar > 45) { perfil = "Perdido"; stats.perdidos++; }

        let pedidosFDS = 0, pedidosNoturnos = 0, pedidosAlmoco = 0;

        pedidosDoCliente.forEach(pedido => {
          const dataPedido = new Date(pedido.created_at);
          if ([0, 5, 6].includes(dataPedido.getDay())) pedidosFDS++;
          if (dataPedido.getHours() >= 20 || dataPedido.getHours() < 4) pedidosNoturnos++;
          if (dataPedido.getHours() >= 11 && dataPedido.getHours() <= 14) pedidosAlmoco++;

          // Alimenta Mapa de Calor Apenas com Pedidos Recentes e de Entrega
          if (!pedido.customer_address.toLowerCase().includes("retirada") && dataPedido >= limiteDiasCalor) {
            const { rua, bairro, cidade } = extrairDadosEndereco(pedido.customer_address);
            if (!bairrosAgrupados[bairro]) bairrosAgrupados[bairro] = { count: 0, sampleRua: rua, cidade: cidade };
            bairrosAgrupados[bairro].count += 1;
          }

          pedido.order_items?.forEach((item: any) => { contagemProdutos[item.product_name] = (contagemProdutos[item.product_name] || 0) + item.quantity; });
        });

        const dadosPessoais = extrairDadosEndereco(cliente.address || "");
        return { 
          ...cliente, numPedidos, totalGasto, diasSemComprar, perfil, 
          enderecoLimpo: dadosPessoais.rua || "Não informado", 
          bairroLimpo: dadosPessoais.bairro,
          tags: { fds: numPedidos > 0 && (pedidosFDS / numPedidos) >= 0.6, noite: numPedidos > 0 && (pedidosNoturnos / numPedidos) >= 0.5, almoco: numPedidos > 0 && (pedidosAlmoco / numPedidos) >= 0.5 } 
        };
      });

      const topProdArr = Object.entries(contagemProdutos).sort((a, b) => b[1] - a[1]);
      if (topProdArr.length > 0) stats.topProduto = topProdArr[0][0];

      // BUSCA MILIMÉTRICA NO GPS COM TRAVA DE CIDADE
      const bairrosOrdenados = Object.entries(bairrosAgrupados).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
      const bairrosMapeados = [];
      
      for (const [bairro, data] of bairrosOrdenados) {
        try {
          const cityToSearch = data.cidade || cidadeLoja;
          if (!cityToSearch) continue; // Sem cidade base, aborta para não errar
          
          let geo = [];

          // TENTATIVA 1: Pesquisa ESTRUTURADA (Obriga a achar a rua DENTRO da cidade especificada)
          if (data.sampleRua) {
            const urlRua = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(data.sampleRua)}&city=${encodeURIComponent(cityToSearch)}&country=Brazil`;
            let res = await fetch(urlRua);
            geo = await res.json();
          }

          // TENTATIVA 2: Se a rua não existir no mapa (CEP genérico), tenta achar o BAIRRO + CIDADE
          if (geo.length === 0 && bairro) {
            const urlBairro = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(bairro + ', ' + cityToSearch + ', Brazil')}`;
            let res = await fetch(urlBairro);
            geo = await res.json();
          }

          // TENTATIVA 3 (TRAVA FINAL): Se for um bairro isolado e o mapa não souber onde é, 
          // jogamos a "bolha de calor" no CENTRO da cidade do Lojista, para não perder o dado e não ir para outro estado.
          if (geo.length === 0) {
            const urlCidade = `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(cityToSearch)}&country=Brazil`;
            let res = await fetch(urlCidade);
            geo = await res.json();
          }

          if (geo.length > 0) {
            let colorHex = ""; let colorClass = ""; let nivel = "";
            
            if (data.count >= 6) { 
              colorHex = "#10b981"; colorClass = "text-emerald-700 border-emerald-200 bg-emerald-50"; nivel = "Alta (Verde)"; 
            } else if (data.count >= 3) { 
              colorHex = "#3b82f6"; colorClass = "text-blue-700 border-blue-200 bg-blue-50"; nivel = "Média (Azul)"; 
            } else { 
              colorHex = "#ef4444"; colorClass = "text-red-700 border-red-200 bg-red-50"; nivel = "Baixa (Vermelha)"; 
            }

            bairrosMapeados.push({
              name: bairro, count: data.count, nivel, colorHex, colorClass,
              lat: parseFloat(geo[0].lat), lng: parseFloat(geo[0].lon)
            });
          }
          // Delay anti-bloqueio do Nominatim
          await new Promise(r => setTimeout(r, 400));
        } catch(e) {}
      }

      setMapaCalorDados(bairrosMapeados);
      setSegmentos(stats);
      setClientesProcessados(clientesComRFM.sort((a, b) => b.totalGasto - a.totalGasto)); 
    }
    setLoading(false);
  };

  useEffect(() => { carregarDadosInteligentes(); }, [tenantId]);

  const abrirNovaCampanha = (segmentoFocus: string) => {
    setEditandoId(null); setAutoNome(""); setAutoSegmento(segmentoFocus); setAutoGatilho("Sextas as 18h");
    setAutoMsg("Olá {{nome_cliente}}! Temos uma oferta especial para você."); setAutoCupomCod(""); setAutoCupomDesc(10);
    setModalAutomacao(true);
  };

  const abrirEdicaoCampanha = (auto: any) => {
    setEditandoId(auto.id); setAutoNome(auto.name); setAutoGatilho(auto.trigger_time); setAutoSegmento(auto.target_segment);
    setAutoMsg(auto.message_template); setAutoCupomCod(""); setAutoCupomDesc(10);
    setModalAutomacao(true);
  };

  const salvarAutomacao = async () => {
    if (!autoNome) return alert("Preencha o nome da campanha.");
    setSalvandoAuto(true);
    const payload = { tenant_id: tenantId, name: autoNome, trigger_time: autoGatilho, target_segment: autoSegmento, message_template: autoMsg, is_active: true };

    try {
      if (editandoId) await supabase.from("automations").update(payload).eq("id", editandoId);
      else await supabase.from("automations").insert([payload]);

      if (autoCupomCod && autoCupomDesc > 0) {
        await supabase.from("coupons").insert([{ tenant_id: tenantId, code: autoCupomCod.toUpperCase(), discount_percent: autoCupomDesc, is_active: true }]);
      }
      setModalAutomacao(false);
      carregarDadosInteligentes();
    } catch (err: any) { alert("Erro ao salvar."); } finally { setSalvandoAuto(false); }
  };

  const toggleAutomacao = async (id: string, statusAtual: boolean) => {
    await supabase.from("automations").update({ is_active: !statusAtual }).eq("id", id);
    carregarDadosInteligentes();
  };

  const clientesFiltrados = clientesProcessados.filter(c => c.name.toLowerCase().includes(pesquisa.toLowerCase()) || c.phone.includes(pesquisa));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 text-zinc-900 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inteligência de Dados</h1>
          <p className="text-zinc-500 mt-1 text-sm">Mapeamento de calor vivo na cidade e gatilhos de automação.</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-zinc-200 overflow-x-auto">
        <button onClick={() => setAbaCrm("rfm")} className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${abaCrm === "rfm" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><BrainCircuit size={18} /> Inteligência Geográfica</button>
        <button onClick={() => setAbaCrm("clientes")} className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${abaCrm === "clientes" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Users size={18} /> Base de Clientes</button>
        <button onClick={() => setAbaCrm("automacoes")} className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${abaCrm === "automacoes" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Zap size={18} /> Gatilhos de Venda</button>
      </div>

      {abaCrm === "rfm" && (
        <div className="animate-in fade-in space-y-6">
          <div className="bg-zinc-900 rounded-2xl p-8 flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /> Previsão de Receita Estagnada</p>
              <h2 className="text-white text-2xl font-medium max-w-xl">Temos <strong className="text-red-400">{segmentos.risco} clientes</strong> em risco. Dinheiro deixado na mesa:</h2>
              <div className="mt-4 flex items-end gap-4"><span className="text-5xl font-black text-white">R$ {segmentos.dinheiroDeixadoNaMesa.toFixed(2).replace(".", ",")}</span><span className="text-zinc-400 font-medium pb-2">/ ciclo</span></div>
            </div>
            <div className="relative z-10 hidden md:block"><button onClick={() => abrirNovaCampanha("Risco")} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center gap-2"><DollarSign size={20} /> Acionar Recuperação</button></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Map size={18} className="text-blue-600" /> Mapa de Calor Vivo (Ruas e Bairros)</h3>
                <div className="flex gap-4 text-xs font-bold text-zinc-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Alta (6+)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Média (3 a 5)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Baixa (1 a 2)</span>
                </div>
              </div>
              {loading ? (
                <div className="w-full h-80 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100"><span className="animate-pulse text-zinc-400 font-bold flex items-center gap-2">Geolocalizando endereços...</span></div>
              ) : (
                <MapaCalorReal centro={centroMapa} bairros={mapaCalorDados} />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm overflow-y-auto max-h-[420px]">
              <h3 className="font-bold text-zinc-900 mb-1">Status Térmico</h3>
              <p className="text-xs text-zinc-500 mb-4">Se não houver novos pedidos em 30 dias, a região esfria e fica vermelha.</p>
              
              <div className="space-y-3">
                {mapaCalorDados.length === 0 ? <p className="text-sm text-zinc-500">Aguardando novos pedidos...</p> : null}
                {mapaCalorDados.map((bairro, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-zinc-50 pb-3 last:border-0">
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{bairro.name}</p>
                      <p className="text-xs text-zinc-500">{bairro.count} entregas ativas</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${bairro.colorClass}`}>
                      {bairro.nivel.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-zinc-900 pt-4">Mapeamento Comportamental</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div><div className="flex items-center gap-2 text-purple-600 mb-2"><Moon size={20} /><span className="font-bold text-sm">Notívagos</span></div><h3 className="font-bold text-zinc-900 text-2xl">{segmentos.notivagos} Clientes</h3><p className="text-sm text-zinc-500 mt-2">Concentram seus pedidos após as 20h.</p></div>
              <button onClick={() => abrirNovaCampanha("Notivagos")} className="mt-6 text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors text-left flex items-center gap-1">Acionar público <Plus size={16}/></button>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div><div className="flex items-center gap-2 text-orange-500 mb-2"><Sun size={20} /><span className="font-bold text-sm">Almoço Executivo</span></div><h3 className="font-bold text-zinc-900 text-2xl">{segmentos.almoco} Clientes</h3><p className="text-sm text-zinc-500 mt-2">Pedidos efetuados entre 11h e 14h.</p></div>
              <button onClick={() => abrirNovaCampanha("Almoco")} className="mt-6 text-sm font-bold text-orange-600 hover:text-orange-800 transition-colors text-left flex items-center gap-1">Acionar público <Plus size={16}/></button>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div><div className="flex items-center gap-2 text-emerald-600 mb-2"><CalendarDays size={20} /><span className="font-bold text-sm">Pico Fim de Semana</span></div><h3 className="font-bold text-zinc-900 text-2xl">{segmentos.fimDeSemana} Clientes</h3><p className="text-sm text-zinc-500 mt-2">Comportamento de Sexta a Domingo.</p></div>
              <button onClick={() => abrirNovaCampanha("FimDeSemana")} className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors text-left flex items-center gap-1">Acionar público <Plus size={16}/></button>
            </div>
          </div>
        </div>
      )}

      {abaCrm === "clientes" && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex gap-4 items-center">
            <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-2.5 text-zinc-400" size={18} /><input type="text" placeholder="Buscar cliente..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="w-full pl-10 border border-zinc-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            <p className="text-sm font-semibold text-zinc-600">Total: {clientesProcessados.length}</p>
          </div>
          
          {loading ? <div className="p-10 text-center text-zinc-500 font-medium flex items-center justify-center gap-2"><Clock size={20} className="animate-spin" /> Analisando métricas...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                    <th className="p-4 font-semibold">Cliente / Contato</th>
                    <th className="p-4 font-semibold">Endereço Principal</th>
                    <th className="p-4 font-semibold">Consumo (30 dias)</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-4"><p className="font-bold text-zinc-900">{cliente.name}</p><p className="text-xs text-zinc-500 mt-0.5">{cliente.phone}</p></td>
                      <td className="p-4"><p className="font-medium text-zinc-800 line-clamp-1 max-w-[250px]">{cliente.enderecoLimpo}</p><p className="text-xs font-bold text-blue-600 mt-0.5 bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-100">{cliente.bairroLimpo}</p></td>
                      <td className="p-4 text-zinc-600"><p className="font-bold text-emerald-600">R$ {cliente.totalGasto.toFixed(2).replace(".", ",")}</p><p className="text-xs mt-0.5">{cliente.numPedidos} pedidos (Último há {cliente.diasSemComprar}d)</p></td>
                      <td className="p-4 text-center flex flex-col items-center gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border w-32 ${cliente.perfil === "VIP" ? "bg-blue-50 text-blue-700 border-blue-200" : cliente.perfil === "Recém-Chegado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : cliente.perfil === "Risco" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>{cliente.perfil}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {abaCrm === "automacoes" && (
        <div className="animate-in fade-in space-y-6">
          <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
            <div><h2 className="text-xl font-bold text-zinc-900">Gatilhos de Venda</h2><p className="text-sm text-zinc-500 mt-1">Gerencie suas automações baseadas no comportamento do cliente.</p></div>
            <button onClick={() => abrirNovaCampanha("Todos")} className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"><Plus size={18} /> Nova Automação</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {automacoes.map((auto) => (
              <div key={auto.id} className={`flex items-center justify-between p-6 rounded-xl border transition-all ${auto.is_active ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-50 border-zinc-200 opacity-60'}`}>
                <div className="flex gap-5 items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${auto.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-200 text-zinc-500'}`}>{auto.is_active ? <Play fill="currentColor" size={20} /> : <Pause fill="currentColor" size={20} />}</div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-lg flex items-center gap-2">{auto.name} <button onClick={() => abrirEdicaoCampanha(auto)} className="text-zinc-400 hover:text-blue-600 transition-colors ml-2"><Edit size={16} /></button></h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 font-medium"><span className="flex items-center gap-1.5"><Clock size={14}/> {auto.trigger_time}</span><span className="flex items-center gap-1.5"><Users size={14}/> {auto.target_segment}</span></div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={auto.is_active} onChange={() => toggleAutomacao(auto.id, auto.is_active)} />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalAutomacao && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center bg-zinc-900/80 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="border-b border-zinc-200 px-6 py-4 flex justify-between items-center bg-zinc-50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Zap size={20} className="text-blue-600"/> {editandoId ? "Editar Gatilho" : "Novo Gatilho"}</h2>
              <button onClick={() => setModalAutomacao(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors"><XCircle size={24} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div><label className="block text-sm font-semibold text-zinc-700 mb-1">Nome Interno</label><input type="text" value={autoNome} onChange={e => setAutoNome(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-zinc-700 mb-1">Gatilho Automático</label><select value={autoGatilho} onChange={e => setAutoGatilho(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none"><option value="Diario 11h">Diariamente às 11:00</option><option value="Sextas as 18h">Toda Sexta às 18:00</option><option value="Inativos 30d">30 dias sem comprar</option></select></div>
                <div><label className="block text-sm font-semibold text-zinc-700 mb-1">Segmento</label><select value={autoSegmento} onChange={e => setAutoSegmento(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none"><option value="Todos">Toda a Base</option><option value="Risco">Risco de Churn</option><option value="VIP">Apenas VIPs</option><option value="FimDeSemana">Fim de Semana</option></select></div>
              </div>
              {!editandoId && (
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                  <div><label className="text-sm font-semibold text-zinc-700 mb-1 flex items-center gap-1"><Tag size={16}/> Gerar Cupom</label><input type="text" value={autoCupomCod} onChange={e => setAutoCupomCod(e.target.value.toUpperCase())} className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase font-bold text-blue-700" /></div>
                  <div><label className="block text-sm font-semibold text-zinc-700 mb-1">Desconto (%)</label><input type="number" value={autoCupomDesc} onChange={e => setAutoCupomDesc(Number(e.target.value))} className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none" /></div>
                </div>
              )}
              <div><label className="block text-sm font-semibold text-zinc-700 mb-1">Mensagem Base</label><textarea rows={3} value={autoMsg} onChange={e => setAutoMsg(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none text-zinc-700" /></div>
              <div className="pt-2"><button onClick={salvarAutomacao} disabled={salvandoAuto} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">{salvandoAuto ? "Salvando..." : <><CheckCircle2 size={20} /> Ativar Gatilho</>}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}