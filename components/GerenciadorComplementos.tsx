"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function GerenciadorComplementos({ produtos }: { produtos: any[] }) {
  const [produtoId, setProdutoId] = useState("");
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [maxItens, setMaxItens] = useState(1);
  const [obrigatorio, setObrigatorio] = useState(false);
  
  const [grupoIdSelecionado, setGrupoIdSelecionado] = useState("");
  const [nomeItem, setNomeItem] = useState("");
  const [precoItem, setPrecoItem] = useState("");

  const [mensagem, setMensagem] = useState("");

  // 1. Criar o Grupo (A Pergunta)
  const handleCriarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");

    if (!produtoId) return setMensagem("Selecione um produto primeiro!");

    const { data, error } = await supabase
      .from("complement_groups")
      .insert([
        {
          product_id: produtoId,
          name: nomeGrupo,
          is_required: obrigatorio,
          min_items: obrigatorio ? 1 : 0,
          max_items: maxItens
        }
      ])
      .select()
      .single();

    if (error) {
      setMensagem("Erro ao criar grupo: " + error.message);
    } else {
      setMensagem(`Grupo "${nomeGrupo}" criado! Agora adicione os itens abaixo.`);
      setGrupoIdSelecionado(data.id); // Já seleciona o grupo para adicionar itens
      setNomeGrupo("");
    }
  };

  // 2. Criar o Item (A Resposta / O Adicional)
  const handleCriarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");

    if (!grupoIdSelecionado) return setMensagem("Crie ou selecione um grupo primeiro!");

    const precoFormatado = precoItem ? parseFloat(precoItem.replace(",", ".")) : 0;

    const { error } = await supabase
      .from("complement_items")
      .insert([
        {
          group_id: grupoIdSelecionado,
          name: nomeItem,
          price: precoFormatado
        }
      ]);

    if (error) {
      setMensagem("Erro ao adicionar item: " + error.message);
    } else {
      setMensagem(`Item "${nomeItem}" adicionado com sucesso! 🥓`);
      setNomeItem("");
      setPrecoItem("");
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🍟</span>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Complementos e Adicionais (Upsell)</h2>
          <p className="text-sm text-zinc-500">Aumente o ticket médio oferecendo extras aos seus clientes.</p>
        </div>
      </div>

      {mensagem && (
        <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
          {mensagem}
        </div>
      )}

      {/* Passo A: Escolher Produto e Criar Grupo */}
      <div className="bg-zinc-50 p-5 rounded-lg border border-zinc-200">
        <h3 className="font-bold text-zinc-800 mb-4">1. Criar Categoria de Adicionais</h3>
        <form onSubmit={handleCriarGrupo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Para qual produto?</label>
            <select 
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              required
            >
              <option value="">Selecione o produto...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Nome da Categoria</label>
              <input type="text" value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} placeholder="Ex: Turbine o seu lanche" className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Máximo de escolhas</label>
              <input type="number" min="1" value={maxItens} onChange={(e) => setMaxItens(parseInt(e.target.value))} className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" required />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={obrigatorio} onChange={(e) => setObrigatorio(e.target.checked)} className="w-4 h-4 accent-red-600" />
            <span className="text-sm font-medium text-zinc-700">O cliente é obrigado a escolher? (Ex: Ponto da carne)</span>
          </label>

          <button type="submit" className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
            Criar Categoria
          </button>
        </form>
      </div>

      {/* Passo B: Adicionar Itens ao Grupo (Só aparece se um grupo foi criado/selecionado) */}
      {grupoIdSelecionado && (
        <div className="bg-red-50 p-5 rounded-lg border border-red-100 animate-in fade-in duration-300">
          <h3 className="font-bold text-red-900 mb-4">2. Adicionar Opções a esta Categoria</h3>
          <form onSubmit={handleCriarItem} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-red-800 uppercase mb-1">Nome do Adicional</label>
              <input type="text" value={nomeItem} onChange={(e) => setNomeItem(e.target.value)} placeholder="Ex: Bacon Extra" className="w-full border border-red-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" required />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-bold text-red-800 uppercase mb-1">Preço (R$)</label>
              <input type="text" value={precoItem} onChange={(e) => setPrecoItem(e.target.value)} placeholder="Ex: 4,00" className="w-full border border-red-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md text-sm transition-colors">
              Adicionar
            </button>
          </form>
          <p className="text-xs text-red-700 mt-2">*Deixe o preço em branco ou 0,00 se for grátis (Ex: "Sem cebola").</p>
        </div>
      )}
    </div>
  );
}