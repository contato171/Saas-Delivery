"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CadastroRestaurante() {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem("");

    // Enviando os dados para o Supabase
    const { data, error } = await supabase
      .from("tenants")
      .insert([{ name: nome, slug: slug }]);

    if (error) {
      setMensagem("Erro ao cadastrar: " + error.message);
    } else {
      setMensagem("Restaurante cadastrado com sucesso! Banco de dados pronto.");
      setNome("");
      setSlug("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="bg-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-zinc-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Setup de Novo Cliente</h1>
        <p className="text-zinc-400 text-sm text-center mb-6">Cadastre o restaurante para liberar o painel.</p>
        
        <form onSubmit={handleCadastro} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Nome do Restaurante</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pizzaria do João"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-zinc-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Subdomínio do Cardápio</label>
            <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="pizzariadojoao"
                className="w-full px-4 py-3 bg-transparent focus:outline-none text-white placeholder-zinc-500"
                required
              />
              <span className="flex items-center px-4 text-zinc-500 bg-zinc-800 border-l border-zinc-700 text-sm">
                .seusaas.com
              </span>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors"
          >
            {loading ? "Criando ambiente..." : "Cadastrar Cliente"}
          </button>
          
          {mensagem && (
            <div className={`p-4 rounded-lg text-sm text-center font-medium ${mensagem.includes("Erro") ? "bg-red-900/50 text-red-200 border border-red-800" : "bg-green-900/50 text-green-200 border border-green-800"}`}>
              {mensagem}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}