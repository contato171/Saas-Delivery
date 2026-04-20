// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  Bike, Plus, Phone, Trash2, ShieldCheck, 
  ShieldAlert, Loader2, Calendar, UserPlus, X 
} from "lucide-react";

export default function GestaoMotoboys({ tenantId }: { tenantId: string }) {
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    carregarMotoboys();
  }, [tenantId]);

  const carregarMotoboys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("motoboys")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("joined_at", { ascending: false });
    
    if (data) setMotoboys(data);
    setLoading(false);
  };

  const cadastrarMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) return;

    setSalvando(true);
    const { error } = await supabase.from("motoboys").insert([{
      tenant_id: tenantId,
      name: nome,
      phone: telefone,
      status: 'ativo'
    }]);

    if (!error) {
      setNome(""); setTelefone("");
      setIsModalAberto(false);
      carregarMotoboys();
    } else {
      alert("Erro ao cadastrar motoboy.");
    }
    setSalvando(false);
  };

  const alternarStatus = async (id: string, statusAtual: string) => {
    const novoStatus = statusAtual === 'ativo' ? 'desligado' : 'ativo';
    const msg = novoStatus === 'desligado' ? "Deseja DESLIGAR este parceiro?" : "Deseja ATIVAR este parceiro novamente?";
    
    if (confirm(msg)) {
      const { error } = await supabase.from("motoboys").update({ status: novoStatus }).eq("id", id);
      if (!error) carregarMotoboys();
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto pb-20">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Bike size={32} className="text-indigo-600"/> Gestão de Estafetas
          </h1>
          <p className="text-zinc-500 mt-1">Gerencie a sua frota de entregadores parceiros.</p>
        </div>
        <button 
          onClick={() => setIsModalAberto(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
        >
          <UserPlus size={20}/> Adicionar Novo Parceiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {motoboys.length === 0 ? (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-zinc-200 rounded-3xl text-center">
            <Bike size={48} className="mx-auto text-zinc-300 mb-4"/>
            <h3 className="text-lg font-bold text-zinc-900">Nenhum motoboy cadastrado</h3>
            <p className="text-zinc-500 text-sm">Registe os seus entregadores para controlar o tempo de despacho.</p>
          </div>
        ) : motoboys.map((moto) => (
          <div key={moto.id} className={`bg-white border p-5 rounded-2xl shadow-sm transition-all ${moto.status === 'desligado' ? 'opacity-60 bg-zinc-50 border-zinc-200' : 'border-zinc-100 hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${moto.status === 'ativo' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-200 text-zinc-500'}`}>
                  {moto.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 leading-tight">{moto.name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${moto.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {moto.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => alternarStatus(moto.id, moto.status)}
                className={`p-2 rounded-lg transition-colors ${moto.status === 'ativo' ? 'text-red-400 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                title={moto.status === 'ativo' ? 'Desligar' : 'Reativar'}
              >
                {moto.status === 'ativo' ? <ShieldAlert size={20}/> : <ShieldCheck size={20}/>}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-50">
              <p className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Phone size={14}/> {moto.phone}</p>
              <p className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Calendar size={14}/> Parceiro desde {new Date(moto.joined_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CADASTRO */}
      {isModalAberto && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h2 className="font-black text-xl text-zinc-900">Novo Motoboy Parceiro</h2>
              <button onClick={() => setIsModalAberto(false)} className="text-zinc-400 hover:text-zinc-800"><X size={24}/></button>
            </div>
            
            <form onSubmit={cadastrarMotoboy} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Nome Completo</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Telemóvel / WhatsApp</label>
                <input required type="text" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: (38) 99999-9999" className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {salvando ? <Loader2 size={20} className="animate-spin"/> : "Confirmar Parceria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}