// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import dynamic from "next/dynamic";
import { 
  UploadCloud, Loader2, Image as ImageIcon, CheckCircle2, 
  AlertCircle, Clock, MapPin, Crosshair, Map, Navigation, Trash2, MousePointerClick
} from "lucide-react";

const MapaRaio = dynamic(() => import('./MapaRaio'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 font-bold gap-2"><Loader2 className="animate-spin" size={20} /> Conectando satélite...</div>
});

export default function ConfigLoja({ tenant, onUpdate }: { tenant: any, onUpdate: () => void }) {
  const [abaAtiva, setAbaAtiva] = useState("logistica");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");

  const [nome, setNome] = useState(tenant.name || "");
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp || "");
  const [endereco, setEndereco] = useState(tenant.address || "");
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(tenant.logo_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(tenant.cover_url || null);

  const [cep, setCep] = useState(tenant.zip_code || "");
  const [raioEntrega, setRaioEntrega] = useState(tenant.delivery_radius_km || 10);
  const [taxaEntrega, setTaxaEntrega] = useState(tenant.base_delivery_fee || 5.00);
  
  const [coordenadasLoja, setCoordenadasLoja] = useState<[number, number]>(
    tenant.lat && tenant.lng ? [tenant.lat, tenant.lng] : [-22.8833, -42.0167]
  );
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [zonas, setZonas] = useState<any[]>(tenant.delivery_zones || []);
  const [modoAdicaoZona, setModoAdicaoZona] = useState(false);

  const defaultHours = {
    seg: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    ter: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    qua: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    qui: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    sex: { ativo: true, abertura: "18:00", fechamento: "23:59" },
    sab: { ativo: true, abertura: "18:00", fechamento: "23:59" },
    dom: { ativo: true, abertura: "18:00", fechamento: "23:00" },
  };
  const [horarios, setHorarios] = useState(tenant.business_hours || defaultHours);

  const diasSemana = [
    { key: "seg", label: "Segunda-feira" }, { key: "ter", label: "Terça-feira" },
    { key: "qua", label: "Quarta-feira" }, { key: "qui", label: "Quinta-feira" },
    { key: "sex", label: "Sexta-feira" }, { key: "sab", label: "Sábado" }, { key: "dom", label: "Domingo" }
  ];

  const buscarCoordenadas = async (cepAlvo: string) => {
    const cepLimpo = cepAlvo.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    try {
      const resViaCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dataViaCep = await resViaCep.json();
      
      if (dataViaCep.erro) {
        alert("CEP não encontrado.");
        setBuscandoCep(false); return;
      }

      const fetchGeo = async (query: string) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&email=suporte@nexusdelivery.com&addressdetails=1&limit=1`;
          const res = await fetch(url);
          if (!res.ok) return [];
          return await res.json();
        } catch (e) { return []; }
      };

      let geo = [];
      // O grande truque de precisão: adicionar o ", Brasil" na busca
      if (dataViaCep.logradouro) geo = await fetchGeo(`${dataViaCep.logradouro}, ${dataViaCep.localidade}, Brasil`);
      if (geo.length === 0 && dataViaCep.bairro) geo = await fetchGeo(`${dataViaCep.bairro}, ${dataViaCep.localidade}, Brasil`);
      if (geo.length === 0) geo = await fetchGeo(`${dataViaCep.localidade}, ${dataViaCep.uf}, Brasil`);

      if (geo && geo.length > 0) {
        setCoordenadasLoja([parseFloat(geo[0].lat), parseFloat(geo[0].lon)]);
      } else {
        alert("Satélite não desenhou o pino automaticamente. Arraste o pino manualmente no mapa.");
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoCep = e.target.value.replace(/\D/g, '');
    setCep(novoCep);
    if (novoCep.length === 8) buscarCoordenadas(novoCep);
  };

  const handleMapClick = (latlng: any) => {
    if (modoAdicaoZona) {
      setZonas([...zonas, { id: Date.now().toString(), nome: "Nova Região", lat: latlng.lat, lng: latlng.lng, raio: 5, taxa: 15 }]);
      setModoAdicaoZona(false);
    }
  };

  const handleZonaDragEnd = (index: number, lat: number, lng: number) => {
    const newZonas = [...zonas]; newZonas[index].lat = lat; newZonas[index].lng = lng; setZonas(newZonas);
  };

  const removerZona = (indexToRemove: number) => setZonas(zonas.filter((_, idx) => idx !== indexToRemove));
  const handleHorarioChange = (dia: string, campo: string, valor: any) => setHorarios((prev: any) => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }));
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (file) { if (type === "logo") { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); } else { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); } }
  };

  const uploadStorage = async (file: File, type: "logo" | "cover") => {
    const ext = file.name.split('.').pop(); const fileName = `lojas/${tenant.id}_${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('cardapio').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName); return data.publicUrl;
  };

  const salvarDadosLoja = async () => {
    setLoading(true); setMensagem(""); setTipoMensagem("");
    try {
      let finalLogo = tenant.logo_url; let finalCover = tenant.cover_url;
      if (logoFile) finalLogo = await uploadStorage(logoFile, "logo");
      if (coverFile) finalCover = await uploadStorage(coverFile, "cover");
      const zapLimpo = whatsapp.replace(/\D/g, '');

      const { error } = await supabase.from("tenants").update({ 
          name: nome, whatsapp: zapLimpo, address: endereco, logo_url: finalLogo, cover_url: finalCover,
          zip_code: cep, delivery_radius_km: raioEntrega, base_delivery_fee: parseFloat(taxaEntrega.toString().replace(",", ".")),
          business_hours: horarios, lat: coordenadasLoja[0], lng: coordenadasLoja[1], delivery_zones: zonas
      }).eq("id", tenant.id);

      if (error) throw error;
      setMensagem("Configurações salvas com sucesso!"); setTipoMensagem("sucesso"); onUpdate();
    } catch (e: any) { setMensagem("Erro ao salvar: " + e.message); setTipoMensagem("erro");
    } finally { setLoading(false); setTimeout(() => { setMensagem(""); setTipoMensagem(""); }, 5000); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden min-h-[600px] animate-in fade-in max-w-[1400px] mx-auto">
      <div className="border-b border-zinc-200 px-6 pt-4 flex gap-6 bg-zinc-50/50 overflow-x-auto">
        <button onClick={() => setAbaAtiva("sobre")} className={`font-bold text-sm pb-4 -mb-px border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "sobre" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>Sobre a Loja & Visual</button>
        <button onClick={() => setAbaAtiva("horarios")} className={`font-bold text-sm pb-4 -mb-px border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "horarios" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>Horários de Funcionamento</button>
        <button onClick={() => setAbaAtiva("logistica")} className={`font-bold text-sm pb-4 -mb-px border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "logistica" ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>Área de Entrega & Taxas</button>
      </div>

      <div className="p-8">
        
        {mensagem && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-2 ${tipoMensagem === "sucesso" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {tipoMensagem === "sucesso" ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertCircle size={20} className="text-red-500"/>} {mensagem}
          </div>
        )}

        {abaAtiva === "sobre" && (
          <div className="max-w-3xl space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Identidade Visual</h2>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1"><label className="block text-sm font-bold text-zinc-700 mb-2">Capa do Cardápio</label><label className="relative w-full h-32 flex flex-col items-center justify-center border-2 border-zinc-300 border-dashed rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-all overflow-hidden group">{coverPreview ? <img src={coverPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" alt="Capa" /> : <UploadCloud className="text-zinc-400 mb-2"/>}<span className="absolute text-xs font-bold text-zinc-900 bg-white/90 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Alterar Capa</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "cover")} /></label></div>
                <div className="w-32 shrink-0"><label className="block text-sm font-bold text-zinc-700 mb-2 text-center">Logotipo</label><label className="relative w-32 h-32 flex flex-col items-center justify-center border-2 border-zinc-300 border-dashed rounded-full cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-all overflow-hidden group">{logoPreview ? <img src={logoPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" alt="Logo" /> : <ImageIcon className="text-zinc-400 mb-2"/>}<span className="absolute text-[10px] text-center font-bold text-zinc-900 bg-white/90 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Alterar Logo</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} /></label></div>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-4 pt-4 border-t border-zinc-100">Informações Básicas</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-bold text-zinc-700 mb-1">Nome do Restaurante</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-sm font-bold text-zinc-700 mb-1">WhatsApp de Atendimento (Com DDD)</label><input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 11999999999" className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-sm font-bold text-zinc-700 mb-1">Endereço Físico</label><textarea value={endereco} onChange={e => setEndereco(e.target.value)} rows={2} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
                <button onClick={salvarDadosLoja} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors mt-2 flex items-center gap-2 shadow-sm">{loading ? <Loader2 size={18} className="animate-spin" /> : "Salvar Alterações"}</button>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === "horarios" && (
          <div className="max-w-3xl space-y-6 animate-in fade-in">
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex items-start gap-4"><Clock className="text-indigo-600 shrink-0 mt-0.5" /><div><h3 className="font-bold text-indigo-900">Gestão de Horários</h3><p className="text-sm text-indigo-800 mt-1 leading-relaxed">Defina os dias e horários em que sua loja está operando. O cardápio exibirá "Aberto" ou "Fechado" automaticamente e bloqueará pedidos fora do expediente.</p></div></div>
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-100 bg-zinc-50/50 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:grid"><div className="col-span-4">Dia da Semana</div><div className="col-span-3 text-center">Abertura</div><div className="col-span-3 text-center">Fechamento</div><div className="col-span-2 text-right">Status</div></div>
              <div className="divide-y divide-zinc-100">
                {diasSemana.map((dia) => {
                  const data = horarios[dia.key];
                  return (
                    <div key={dia.key} className={`grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 items-center transition-colors ${!data.ativo ? "bg-zinc-50/80" : ""}`}>
                      <div className="col-span-4 font-bold text-zinc-800">{dia.label}</div>
                      <div className="col-span-3"><input type="time" value={data.abertura} onChange={(e) => handleHorarioChange(dia.key, "abertura", e.target.value)} disabled={!data.ativo} className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-zinc-100" /></div>
                      <div className="col-span-3"><input type="time" value={data.fechamento} onChange={(e) => handleHorarioChange(dia.key, "fechamento", e.target.value)} disabled={!data.ativo} className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-zinc-100" /></div>
                      <div className="col-span-2 flex justify-end"><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={data.ativo} onChange={(e) => handleHorarioChange(dia.key, "ativo", e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div></label></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-2"><button onClick={salvarDadosLoja} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">{loading ? <Loader2 size={18} className="animate-spin" /> : "Salvar Horários"}</button></div>
          </div>
        )}

        {abaAtiva === "logistica" && (
          <div className="space-y-6 animate-in slide-in-from-left-2 w-full">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3">
              <Navigation className="text-indigo-600 shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-indigo-900 text-sm">Motor Geográfico & Inteligência de Frete</h3>
                <p className="text-indigo-700 text-xs mt-0.5">Mova os pinos e defina visualmente onde você quer entregar. O checkout calculará a cobertura automaticamente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 flex items-center gap-2">
                    CEP Sede da Loja (Centro do Mapa) *
                    {buscandoCep && <Loader2 size={12} className="animate-spin text-indigo-600"/>}
                  </label>
                  <input type="text" value={cep} onChange={handleCepChange} placeholder="Ex: 28905125" maxLength={9} className="w-full border border-zinc-300 rounded-xl p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" />
                  <p className="text-[10px] font-bold text-indigo-500 mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    📍 DICA: Se o CEP não cravar a rua certinha, não se preocupe! Segure e arraste o Pino Azul no mapa para o local exato da sua loja.
                  </p>
                </div>

                <div className="bg-zinc-50 p-5 border border-zinc-200 rounded-xl space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="block text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5"><Crosshair size={14}/> Raio Geral da Loja</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={raioEntrega} onChange={(e) => setRaioEntrega(Number(e.target.value))} className="w-20 border border-zinc-300 rounded-lg p-2 text-lg font-black text-indigo-600 text-center outline-none focus:ring-2 focus:ring-indigo-600 bg-white" />
                      <span className="font-bold text-zinc-400 text-sm">KM</span>
                    </div>
                  </div>
                  <input type="range" min="1" max="50" step="0.5" value={raioEntrega} onChange={(e) => setRaioEntrega(Number(e.target.value))} className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  
                  <div className="pt-2 border-t border-zinc-200 mt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Taxa de Entrega Padrão (R$) *</label>
                    <div className="relative">
                       <span className="absolute left-4 top-3.5 text-zinc-400 font-bold text-sm">R$</span>
                       <input type="number" step="0.5" value={taxaEntrega} onChange={(e) => setTaxaEntrega(Number(e.target.value))} className="w-full border border-zinc-300 rounded-xl p-3 pl-10 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 bg-white" />
                    </div>
                  </div>
                </div>

                {/* ZONAS ESPECÍFICAS */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2"><MapPin size={16} className="text-purple-600"/> Zonas Customizadas</h3>
                    <button onClick={() => setModoAdicaoZona(!modoAdicaoZona)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${modoAdicaoZona ? 'bg-purple-600 text-white shadow-md animate-pulse' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                      {modoAdicaoZona ? "Cancele ou Clique no Mapa..." : <><MousePointerClick size={14}/> Adicionar Pino</>}
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                    {zonas.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-6 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">Nenhuma zona customizada. Clique em "Adicionar Pino" e depois clique num bairro no mapa.</p>
                    ) : (
                      zonas.map((zona, index) => (
                        <div key={zona.id} className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3 relative group shadow-sm hover:border-purple-300 transition-colors">
                          <button onClick={() => removerZona(index)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 bg-zinc-50 p-1 rounded-md transition-colors"><Trash2 size={16}/></button>
                          <div className="pr-8">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Local (Ex: Búzios)</label>
                            <input type="text" value={zona.nome} onChange={(e) => { const n = [...zonas]; n[index].nome = e.target.value; setZonas(n); }} className="w-full border-b border-zinc-200 p-1 text-sm font-bold text-purple-700 outline-none focus:border-purple-600" />
                          </div>
                          <div className="flex gap-4 items-end pt-2 border-t border-zinc-50">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Crosshair size={10}/> Raio (KM)</label>
                              <input type="range" min="0.5" max="30" step="0.5" value={zona.raio} onChange={(e) => { const n = [...zonas]; n[index].raio = Number(e.target.value); setZonas(n); }} className="w-full accent-purple-600 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer mt-2" />
                              <p className="text-xs font-black text-purple-600 mt-1">{zona.raio} km</p>
                            </div>
                            <div className="w-24">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase">Taxa (R$)</label>
                              <input type="number" step="0.5" value={zona.taxa} onChange={(e) => { const n = [...zonas]; n[index].taxa = Number(e.target.value); setZonas(n); }} className="w-full border border-zinc-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-purple-600 font-bold" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button onClick={salvarDadosLoja} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={20} className="animate-spin"/> : tipoMensagem === "sucesso" ? <CheckCircle2 size={20}/> : <Map size={20}/>}
                  {tipoMensagem === "sucesso" ? "Logística Salva!" : "Gravar Configurações"}
                </button>
              </div>

              {/* MAPA INTERATIVO */}
              <div className="h-[500px] lg:h-auto min-h-[500px] bg-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden relative shadow-inner">
                <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-200 shadow-sm pointer-events-none">
                  <p className="text-xs font-bold text-zinc-800">Visualização de Cobertura</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Você pode mover os pinos!</p>
                </div>
                {modoAdicaoZona && (
                  <div className="absolute top-4 right-4 z-20 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none animate-pulse flex items-center gap-2">
                    <MousePointerClick size={16}/> <p className="text-xs font-bold">Clique no mapa</p>
                  </div>
                )}
                
                <MapaRaio 
                  center={coordenadasLoja} 
                  radiusKm={raioEntrega} 
                  onCenterChange={setCoordenadasLoja}
                  zonas={zonas}
                  onAddZonaClick={handleMapClick}
                  onZonaDragEnd={handleZonaDragEnd}
                  modoAdicaoZona={modoAdicaoZona}
                />
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}