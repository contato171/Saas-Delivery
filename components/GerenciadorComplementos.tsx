"use client";

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";

export default function ConfigLoja({ tenant, onUpdate }: { tenant: any, onUpdate: () => void }) {
  const [abaAtiva, setAbaAtiva] = useState("sobre");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Estados: Sobre a Loja
  const [nome, setNome] = useState(tenant.name || "");
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp || "");
  const [endereco, setEndereco] = useState(tenant.address || "");
  
  // Imagens da Loja
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(tenant.logo_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(tenant.cover_url || null);

  // Estados: Logística
  const [cep, setCep] = useState(tenant.zip_code || "");
  const [raioEntrega, setRaioEntrega] = useState(tenant.delivery_radius_km || 10);
  const [taxaEntrega, setTaxaEntrega] = useState(tenant.base_delivery_fee || 5.00);

  // Estados: Horários
  const defaultHours = {
    seg: { ativo: false, abertura: "18:00", fechamento: "23:00" },
    ter: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    qua: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    qui: { ativo: true, abertura: "18:00", fechamento: "23:00" },
    sex: { ativo: true, abertura: "18:00", fechamento: "23:59" },
    sab: { ativo: true, abertura: "18:00", fechamento: "23:59" },
    dom: { ativo: true, abertura: "18:00", fechamento: "23:00" },
  };
  const [horarios, setHorarios] = useState(tenant.operating_hours || defaultHours);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "logo") {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      } else {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadStorage = async (file: File, type: "logo" | "cover") => {
    const ext = file.name.split('.').pop();
    const fileName = `${tenant.id}_${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('lojas').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('lojas').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const salvarDadosLoja = async () => {
    setLoading(true);
    setMensagem("");
    
    try {
      let finalLogo = tenant.logo_url;
      let finalCover = tenant.cover_url;

      if (logoFile) finalLogo = await uploadStorage(logoFile, "logo");
      if (coverFile) finalCover = await uploadStorage(coverFile, "cover");

      const zapLimpo = whatsapp.replace(/\D/g, '');

      const { error } = await supabase
        .from("tenants")
        .update({ 
          name: nome, 
          whatsapp: zapLimpo, 
          address: endereco, 
          logo_url: finalLogo,
          cover_url: finalCover,
          zip_code: cep,
          delivery_radius_km: raioEntrega,
          base_delivery_fee: parseFloat(taxaEntrega.toString().replace(",", ".")),
          operating_hours: horarios 
        })
        .eq("id", tenant.id);

      if (error) throw error;
      setMensagem("Configurações salvas com sucesso!");
      onUpdate();
    } catch (e: any) {
      setMensagem("Erro ao salvar: " + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMensagem(""), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden min-h-[600px] animate-in fade-in">
      <div className="border-b border-zinc-200 px-6 pt-4 flex gap-6 bg-zinc-50/50 overflow-x-auto">
        <button onClick={() => setAbaAtiva("sobre")} className={`font-bold text-sm pb-4 -mb-px border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "sobre" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          🏪 Sobre a Loja & Visual
        </button>
        <button onClick={() => setAbaAtiva("logistica")} className={`font-bold text-sm pb-4 -mb-px border-b-2 transition-colors whitespace-nowrap ${abaAtiva === "logistica" ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
          📍 Área de Entrega
        </button>
      </div>

      <div className="p-8">
        {mensagem && <div className="mb-6 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold flex items-center gap-2">✅ {mensagem}</div>}

        {abaAtiva === "sobre" && (
          <div className="max-w-3xl space-y-8 animate-in fade-in">
            
            {/* NOVO: SEÇÃO DE IMAGENS */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Identidade Visual</h2>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Capa do Cardápio</label>
                  <label className="relative w-full h-32 flex flex-col items-center justify-center border-2 border-zinc-300 border-dashed rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-all overflow-hidden group">
                    {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" alt="Capa" /> : <UploadCloud className="text-zinc-400 mb-2"/>}
                    <span className="absolute text-xs font-bold text-zinc-900 bg-white/90 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Alterar Capa</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "cover")} />
                  </label>
                </div>
                
                <div className="w-32 shrink-0">
                  <label className="block text-sm font-bold text-zinc-700 mb-2 text-center">Logotipo</label>
                  <label className="relative w-32 h-32 flex flex-col items-center justify-center border-2 border-zinc-300 border-dashed rounded-full cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-all overflow-hidden group">
                    {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" alt="Logo" /> : <ImageIcon className="text-zinc-400 mb-2"/>}
                    <span className="absolute text-[10px] text-center font-bold text-zinc-900 bg-white/90 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Alterar Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} />
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE TEXTOS DA LOJA */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-4 pt-4 border-t border-zinc-100">Informações Básicas</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Nome do Restaurante</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">WhatsApp de Atendimento (Com DDD)</label>
                  <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 11999999999" className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Endereço Físico</label>
                  <textarea value={endereco} onChange={e => setEndereco(e.target.value)} rows={2} className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                </div>
                <button onClick={salvarDadosLoja} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors mt-2 flex items-center gap-2 shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === "logistica" && (
          <div className="max-w-2xl space-y-6 animate-in fade-in">
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex gap-4">
               <span className="text-3xl">🛰️</span>
               <div>
                 <h3 className="font-bold text-blue-900">Motor Geográfico Ativado</h3>
                 <p className="text-sm text-blue-800 mt-1">Endereços fora da quilometragem máxima serão bloqueados no Checkout.</p>
               </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">CEP de Origem (Endereço da Loja) *</label>
                <input type="text" maxLength={8} value={cep} onChange={e => setCep(e.target.value.replace(/\D/g, ''))} placeholder="00000000" className="w-full sm:w-2/3 border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Raio Máximo Seguro (KM) *</label>
                  <div className="relative">
                    <input type="number" value={raioEntrega} onChange={e => setRaioEntrega(Number(e.target.value))} className="w-full border border-zinc-300 rounded-lg p-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="absolute right-4 top-3 text-zinc-400 font-bold">KM</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Taxa de Entrega Fixa (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-zinc-400 font-bold">R$</span>
                    <input type="text" value={taxaEntrega} onChange={e => setTaxaEntrega(e.target.value)} className="w-full border border-zinc-300 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <button onClick={salvarDadosLoja} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm">
                  {loading ? "Salvando..." : "Gravar Configurações de Rota"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}