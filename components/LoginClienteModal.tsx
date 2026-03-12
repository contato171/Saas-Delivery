"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginClienteModal({ tenantId, onLoginSucesso, onClose }: { tenantId: string, onLoginSucesso: (cliente: any) => void, onClose: () => void }) {
  const [modo, setModo] = useState<"opcoes" | "celular">("opcoes");
  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Dados Pessoais
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  // Dados de Endereço Estruturado
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cepGenerico, setCepGenerico] = useState(false);

  const buscarCep = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, '');
    setCep(cepLimpo);
    
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setCidade(data.localidade);
      setUf(data.uf);
      
      // Se a rua vier vazia, é um CEP genérico de cidade pequena
      if (!data.logradouro) {
        setCepGenerico(true);
        setRua("");
        setBairro("");
      } else {
        setCepGenerico(false);
        setRua(data.logradouro);
        setBairro(data.bairro);
      }
    } catch (error) {
      console.error("Erro na API de CEP", error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone || !cep || !rua || !numero || !bairro || !cidade) {
      return alert("Preencha todos os campos obrigatórios do endereço.");
    }
    
    setLoading(true);

    // Constrói o endereço formatado e seguro para o banco e para o mapa
    const enderecoFormatado = `${rua}, ${numero}, ${bairro}, ${cidade} - ${uf} | CEP: ${cep} ${complemento ? '| Compl: ' + complemento : ''} ${referencia ? '| Ref: ' + referencia : ''}`;

    try {
      let { data: clienteExistente } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).eq("phone", telefone).single();

      if (!clienteExistente) {
        const { data: novoCliente, error } = await supabase.from("customers").insert([{ 
          tenant_id: tenantId, name: nome, phone: telefone, address: enderecoFormatado 
        }]).select().single();
        if (error) throw error;
        clienteExistente = novoCliente;
      } else {
        const { data: clienteAtualizado } = await supabase.from("customers").update({ address: enderecoFormatado }).eq("id", clienteExistente.id).select().single();
        clienteExistente = clienteAtualizado;
      }

      localStorage.setItem("@saas_customer", JSON.stringify(clienteExistente));
      onLoginSucesso(clienteExistente);
    } catch (error: any) {
      alert("Erro ao logar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-zinc-900/80 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="p-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 font-bold w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center transition-colors">✕</button>
          <h2 className="text-2xl font-black text-zinc-900 mb-1">Acesso Rápido</h2>
          <p className="text-zinc-500 mb-6 text-sm">Identifique-se para validar a entrega.</p>

          {modo === "opcoes" ? (
            <div className="space-y-3">
              <button onClick={() => setModo("celular")} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm">
                Acessar com Celular
              </button>
            </div>
          ) : (
            <form onSubmit={fazerLogin} className="space-y-4 text-left animate-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Nome Completo *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">WhatsApp (Com DDD) *</label>
                  <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required placeholder="11999999999" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-4 mt-4">
                <h3 className="font-bold text-zinc-900 mb-3 text-sm">Endereço de Entrega Exato</h3>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">CEP *</label>
                    <input type="text" maxLength={8} value={cep} onChange={(e) => buscarCep(e.target.value)} required placeholder="00000000" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Cidade / UF</label>
                    <input type="text" value={cidade ? `${cidade} - ${uf}` : ""} disabled className="w-full border border-zinc-200 bg-zinc-50 rounded-lg p-2.5 text-sm text-zinc-500 cursor-not-allowed" placeholder={buscandoCep ? "Buscando..." : ""} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Rua / Avenida *</label>
                    <input type="text" value={rua} onChange={(e) => setRua(e.target.value)} disabled={!cepGenerico && !!rua} required className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!rua) ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'border-zinc-300 focus:ring-2 focus:ring-blue-600'}`} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Número *</label>
                    <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} required className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Bairro *</label>
                  <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} disabled={!cepGenerico && !!bairro} required className={`w-full border rounded-lg p-2.5 text-sm outline-none ${(!cepGenerico && !!bairro) ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'border-zinc-300 focus:ring-2 focus:ring-blue-600'}`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Complemento</label>
                    <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apt, Bloco, Casa 2" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Ponto de Referência</label>
                    <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Perto do mercado" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading || buscandoCep} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors">
                  {loading ? "Validando dados..." : "Salvar e Continuar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}