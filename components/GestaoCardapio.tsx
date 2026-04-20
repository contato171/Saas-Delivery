// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase"; 
import { 
  Plus, Edit3, Trash2, Image as ImageIcon, 
  Loader2, CheckCircle2, X, UploadCloud, LayoutList, Package, Layers,
  FileSpreadsheet, Download, Search, ChevronDown, ChevronUp, GripVertical, Zap, Ticket, ToggleLeft, ToggleRight
} from "lucide-react";

export default function GestaoCardapio({ tenantId }: { tenantId: string }) {
  const [activeTab, setActiveTab] = useState<"categorias" | "produtos" | "complementos" | "cupons">("produtos");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [complementos, setComplementos] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);

  const [formData, setFormData] = useState<any>({});
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  
  const [produtosSelecionadosComp, setProdutosSelecionadosComp] = useState<string[]>([]);
  
  const [novaVariacao, setNovaVariacao] = useState("");

  const [listaItensComp, setListaItensComp] = useState<any[]>([]);
  const [novoNomeItemComp, setNovoNomeItemComp] = useState("");
  const [novoPrecoItemComp, setNovoPrecoItemComp] = useState("");

  const [novoUpsellId, setNovoUpsellId] = useState("");

  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [buscaProduto, setBuscaProduto] = useState("");
  
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem(`@saas_categorias_abertas_${tenantId}`);
      if (salvo) return JSON.parse(salvo);
    }
    return {};
  });

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    let _categorias = [...categorias];
    const draggedItemContent = _categorias.splice(dragItem.current, 1)[0];
    _categorias.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    setCategorias(_categorias); 

    const atualizacoes = _categorias.map((cat, i) => {
      return supabase.from("categories").update({ sort_order: i }).eq("id", cat.id);
    });
    await Promise.all(atualizacoes);
  };

  useEffect(() => {
    carregarDados(true);
  }, [tenantId]);

  async function carregarDados(showLoader = false) {
    if (showLoader) setLoading(true);
    const [catRes, prodRes, compRes, cupomRes] = await Promise.all([
      supabase.from("categories").select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true }),
      supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).order("name"),
      supabase.from("complement_groups").select("*, complement_items(*), products(name)").eq("tenant_id", tenantId).order("name"),
      supabase.from("coupons").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
    ]);

    if (catRes.data) setCategorias(catRes.data);
    if (prodRes.data) setProdutos(prodRes.data);
    if (compRes.data) setComplementos(compRes.data);
    if (cupomRes.data) setCupons(cupomRes.data);
    
    if (showLoader) setLoading(false);
  }

  const abrirModal = (tipo: string, item: any = null) => {
    setItemEditando(item);
    setImagemFile(null);
    setNovaVariacao(""); 
    setNovoNomeItemComp("");
    setNovoPrecoItemComp("");
    setNovoUpsellId("");

    if (item) {
      setFormData({ ...item });
      setImagemPreview(item.image_url || null);
      
      if (tipo === "complementos") {
        setProdutosSelecionadosComp(item.product_id ? [item.product_id] : []);
        setListaItensComp(item.complement_items || []);
      }
    } else {
      if (tipo === "cupons") setFormData({ active: true, desconto: 10, first_purchase_only: false });
      else if (tipo === "produtos") setFormData({ variations: [], upsell_item_ids: [] });
      else if (tipo === "complementos") setFormData({ tipo_calculo: 'soma' });
      else setFormData({});
      
      setImagemPreview(null);
      setProdutosSelecionadosComp([]);
      setListaItensComp([]);
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setItemEditando(null);
    setFormData({});
    setImagemFile(null);
    setImagemPreview(null);
    setProdutosSelecionadosComp([]);
    setNovaVariacao("");
    setListaItensComp([]);
    setNovoNomeItemComp("");
    setNovoPrecoItemComp("");
    setNovoUpsellId("");
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagemFile(file);
      setImagemPreview(URL.createObjectURL(file));
    }
  };

  const uploadFoto = async () => {
    if (!imagemFile) return formData.image_url; 
    const fileExt = imagemFile.name.split('.').pop();
    const fileName = `${tenantId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('cardapio').upload(fileName, imagemFile);
    if (uploadError) {
      alert("Erro ao subir a imagem.");
      return null;
    }
    const { data } = supabase.storage.from('cardapio').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const toggleProdutoComp = (id: string) => {
    if (produtosSelecionadosComp.includes(id)) {
      setProdutosSelecionadosComp(prev => prev.filter(pId => pId !== id));
    } else {
      setProdutosSelecionadosComp(prev => [...prev, id]);
    }
  };

  const handleToggleTodosProdutos = () => {
    if (produtosSelecionadosComp.length === produtos.length) {
      setProdutosSelecionadosComp([]);
    } else {
      setProdutosSelecionadosComp(produtos.map(p => p.id));
    }
  };

  const toggleCategoriaVisivel = (categoriaNome: string) => {
    setCategoriasAbertas(prev => {
      const novoEstado = { ...prev, [categoriaNome]: !prev[categoriaNome] };
      localStorage.setItem(`@saas_categorias_abertas_${tenantId}`, JSON.stringify(novoEstado));
      return novoEstado;
    });
  };

  const addVariacao = () => {
    if (novaVariacao.trim() === "") return;
    const currentVars = formData.variations || [];
    if (!currentVars.includes(novaVariacao.trim())) {
      setFormData({ ...formData, variations: [...currentVars, novaVariacao.trim()] });
    }
    setNovaVariacao("");
  };

  const removeVariacao = (indexToRemove: number) => {
    const currentVars = formData.variations || [];
    setFormData({ ...formData, variations: currentVars.filter((_, idx) => idx !== indexToRemove) });
  };

  const adicionarItemComp = () => {
    if (!novoNomeItemComp.trim()) return;
    setListaItensComp([...listaItensComp, {
      id: `temp_${Date.now()}`, 
      name: novoNomeItemComp,
      price: parseFloat(novoPrecoItemComp.replace(',', '.')) || 0,
    }]);
    setNovoNomeItemComp("");
    setNovoPrecoItemComp("");
  };

  const removerItemComp = (index: number) => {
    setListaItensComp(listaItensComp.filter((_, i) => i !== index));
  };

  const toggleCupomAtivo = async (id: string, statusAtual: boolean) => {
    try {
      await supabase.from("coupons").update({ active: !statusAtual }).eq("id", id);
      carregarDados(false);
    } catch (e) {
      alert("Erro ao alterar o status do cupom.");
    }
  };

  const salvarItem = async () => {
    setSalvando(true);
    try {
      let table = "";
      let payload: any = {};

      if (activeTab === "cupons") {
        if (!formData.code || formData.code.trim() === "") {
          alert("O código do cupom não pode estar vazio.");
          setSalvando(false);
          return;
        }
        table = "coupons";
        payload = {
          tenant_id: tenantId,
          code: formData.code.trim().toUpperCase(),
          desconto: formData.desconto || 0,
          active: formData.active !== undefined ? formData.active : true,
          first_purchase_only: formData.first_purchase_only || false // NOVO: Salva a trava no banco
        };
      } 
      else if (activeTab === "categorias") {
        if (!formData.name || formData.name.trim() === "") {
          alert("O nome da categoria não pode estar vazio.");
          setSalvando(false);
          return;
        }
        table = "categories";
        payload = {
          tenant_id: tenantId,
          name: formData.name,
          sort_order: itemEditando ? formData.sort_order : categorias.length
        };
      } 
      else if (activeTab === "produtos") {
        if (!formData.name || formData.name.trim() === "") {
          alert("O nome do produto não pode estar vazio.");
          setSalvando(false);
          return;
        }
        table = "products";
        let imageUrl = formData.image_url;
        if (imagemFile) {
          imageUrl = await uploadFoto();
        }
        payload = {
          tenant_id: tenantId,
          name: formData.name,
          description: formData.description,
          price: formData.price || 0,
          category_id: formData.category_id,
          image_url: imageUrl,
          variations: formData.variations || [],
          upsell_item_ids: formData.upsell_item_ids || []
        };
      } 
      else if (activeTab === "complementos") {
        if (!formData.name || formData.name.trim() === "") {
          alert("O nome do complemento não pode estar vazio.");
          setSalvando(false);
          return;
        }
        table = "complement_groups";
        if (produtosSelecionadosComp.length === 0) {
          alert("Selecione ao menos um produto para vincular este complemento.");
          setSalvando(false); 
          return;
        }
        payload = {
          tenant_id: tenantId,
          name: formData.name,
          min_items: formData.min_items || 0,
          max_items: formData.max_items || 1,
          is_required: formData.is_required || false,
          tipo_calculo: formData.tipo_calculo || 'soma'
        };
      }

      if (activeTab === "complementos") {
        let groupIdsParaSalvarItens: string[] = [];

        if (itemEditando) {
          payload.product_id = produtosSelecionadosComp[0];
          const { data: updatedGroup, error } = await supabase.from(table).update(payload).eq("id", itemEditando.id).select().single();
          if (error) throw error;
          groupIdsParaSalvarItens.push(updatedGroup.id);

          if (produtosSelecionadosComp.length > 1) {
            const novosPayloads = produtosSelecionadosComp.slice(1).map(pid => ({ ...payload, product_id: pid }));
            const { data: novosGrupos, error: insertError } = await supabase.from(table).insert(novosPayloads).select();
            if (insertError) throw insertError;
            groupIdsParaSalvarItens.push(...novosGrupos.map(g => g.id));
          }
        } else {
          const payloads = produtosSelecionadosComp.map(pid => ({ ...payload, product_id: pid }));
          const { data: novosGrupos, error } = await supabase.from(table).insert(payloads).select();
          if (error) throw error;
          groupIdsParaSalvarItens.push(...novosGrupos.map(g => g.id));
        }

        if (groupIdsParaSalvarItens.length > 0) {
          await supabase.from('complement_items').delete().in('complement_group_id', groupIdsParaSalvarItens);
          
          if (listaItensComp.length > 0) {
            const itensParaBanco: any[] = [];
            groupIdsParaSalvarItens.forEach(gid => {
              listaItensComp.forEach(item => {
                itensParaBanco.push({
                  tenant_id: tenantId,
                  complement_group_id: gid,
                  name: item.name,
                  price: item.price
                });
              });
            });
            const { error: errItems } = await supabase.from('complement_items').insert(itensParaBanco);
            if (errItems) throw errItems;
          }
        }
      } else {
        if (itemEditando) {
          const { error } = await supabase.from(table).update(payload).eq("id", itemEditando.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).insert([payload]);
          if (error) throw error;
        }
      }

      await carregarDados(false);
      fecharModal();
    } catch (error: any) {
      console.error(error);
      alert("Erro do banco de dados: " + (error.message || JSON.stringify(error)));
    } finally {
      setSalvando(false);
    }
  };

  const excluirItem = async (id: string, table: string) => {
    if (!confirm("Tem a certeza que deseja excluir? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
    else carregarDados(false);
  };

  const baixarModeloCSV = () => {
    const header = "Nome do Produto;Descricao;Preco;Nome da Categoria\n";
    const exemplo = "X-Tudo Turbo;Pão, Carne, Queijo, Bacon, Ovo, Salada;35.90;Lanches\nRefrigerante Lata;Coca-Cola 350ml gelada;6.00;Bebidas";
    
    const blob = new Blob(["\uFEFF" + header + exemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "molde_importacao_cardapio.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const linhas = text.split('\n').slice(1).filter(l => l.trim() !== '');
        
        let novasCategorias: Record<string, string> = {}; 
        
        categorias.forEach(cat => {
          novasCategorias[cat.name.toLowerCase().trim()] = cat.id;
        });

        const produtosParaInserir = [];
        let ordensCatAtuais = categorias.length;

        for (const linha of linhas) {
          const colunas = linha.split(';').map(col => col.trim().replace(/^"|"$/g, ''));
          if (colunas.length < 4) continue;

          const nome = colunas[0];
          const descricao = colunas[1];
          const preco = parseFloat(colunas[2].replace(',', '.'));
          const nomeCategoria = colunas[3];

          if (!nome || isNaN(preco) || !nomeCategoria) continue;

          const catNormalizada = nomeCategoria.toLowerCase().trim();
          let category_id = novasCategorias[catNormalizada];

          if (!category_id) {
            const { data: novaCat, error: errCat } = await supabase.from('categories').insert([{
              tenant_id: tenantId,
              name: nomeCategoria,
              sort_order: ordensCatAtuais
            }]).select().single();

            if (!errCat && novaCat) {
              category_id = novaCat.id;
              novasCategorias[catNormalizada] = novaCat.id;
              ordensCatAtuais++;
            }
          }

          if (category_id) {
            produtosParaInserir.push({
              tenant_id: tenantId,
              name: nome,
              description: descricao,
              price: preco,
              category_id: category_id
            });
          }
        }

        if (produtosParaInserir.length > 0) {
          const { error } = await supabase.from('products').insert(produtosParaInserir);
          if (error) throw error;
          alert(`${produtosParaInserir.length} produtos importados com sucesso!`);
          await carregarDados(false); 
        } else {
          alert("Nenhum produto válido encontrado na planilha. Verifique o formato.");
        }

      } catch (error: any) {
        alert("Erro ao importar a planilha: " + error.message);
      } finally {
        setImportando(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };

    reader.readAsText(file);
  };

  const produtosFiltrados = produtos.filter(p => 
    p.name.toLowerCase().includes(buscaProduto.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(buscaProduto.toLowerCase()))
  );

  const produtosAgrupados = produtosFiltrados.reduce((acc, prod) => {
    const catName = prod.categories?.name || "Geral";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(prod);
    return acc;
  }, {} as Record<string, any[]>);

  const chavesAgrupadasOrdenadas = Object.keys(produtosAgrupados).sort((a, b) => {
    const catA = categorias.find(c => c.name === a);
    const catB = categorias.find(c => c.name === b);
    return (catA?.sort_order || 0) - (catB?.sort_order || 0);
  });

  if (loading) return <div className="py-20 flex justify-center text-indigo-600"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-20 animate-in fade-in">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Gestão de Cardápio</h1>
          <p className="text-zinc-500 mt-1 text-sm">Organize categorias, produtos, complementos e cupons.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {activeTab === "produtos" && (
            <div className="flex gap-2">
              <button onClick={baixarModeloCSV} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm border border-zinc-200" title="Baixar planilha de exemplo">
                <Download size={16}/> Modelo CSV
              </button>
              
              <input type="file" accept=".csv" ref={fileInputRef} onChange={processarCSV} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={importando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm shadow-md disabled:opacity-70"
              >
                {importando ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>} 
                Importar CSV
              </button>
            </div>
          )}

          <button onClick={() => abrirModal(activeTab)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2">
            <Plus size={18}/> Novo {activeTab === "categorias" ? "Categoria" : activeTab === "produtos" ? "Produto" : activeTab === "complementos" ? "Complemento" : "Cupom"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 pb-px overflow-x-auto">
        <button onClick={() => setActiveTab("categorias")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "categorias" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><LayoutList size={18}/> Categorias</button>
        <button onClick={() => setActiveTab("produtos")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "produtos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Package size={18}/> Produtos</button>
        <button onClick={() => setActiveTab("complementos")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "complementos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Layers size={18}/> Complementos</button>
        <button onClick={() => setActiveTab("cupons")} className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "cupons" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}><Ticket size={18}/> Cupons</button>
      </div>

      {/* ABA CATEGORIAS */}
      {activeTab === "categorias" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="flex flex-col">
            {categorias.length === 0 ? <p className="p-6 text-center text-zinc-500">Nenhuma categoria cadastrada.</p> : categorias.map((cat, index) => (
              <div 
                key={cat.id} 
                draggable
                onDragStart={(e) => (dragItem.current = index)}
                onDragEnter={(e) => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group cursor-grab active:cursor-grabbing border-b border-zinc-100 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <GripVertical size={20} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                  <p className="font-bold text-zinc-900 select-none">{cat.name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirModal("categorias", cat)} className="p-2 text-zinc-400 hover:text-blue-600 bg-white rounded-lg border border-zinc-200 shadow-sm"><Edit3 size={16}/></button>
                  <button onClick={() => excluirItem(cat.id, "categories")} className="p-2 text-zinc-400 hover:text-red-600 bg-white rounded-lg border border-zinc-200 shadow-sm"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA PRODUTOS */}
      {activeTab === "produtos" && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar pelo nome ou descrição..." 
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm text-sm"
            />
          </div>

          {chavesAgrupadasOrdenadas.length === 0 ? (
            <p className="col-span-full py-10 text-center text-zinc-500 border-2 border-dashed border-zinc-200 rounded-2xl">Nenhum produto encontrado.</p>
          ) : (
            chavesAgrupadasOrdenadas.map(categoria => {
              const estaAberta = categoriasAbertas[categoria]; 
              
              return (
                <div key={categoria} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden transition-all">
                  <div 
                    onClick={() => toggleCategoriaVisivel(categoria)}
                    className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200 flex justify-between items-center cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <h3 className="font-black text-zinc-800 uppercase tracking-wider text-sm flex items-center gap-2">
                      {categoria} <span className="bg-zinc-200 text-zinc-600 text-[10px] px-2 py-0.5 rounded-full">{produtosAgrupados[categoria].length}</span>
                    </h3>
                    <button className="text-zinc-500">
                      {estaAberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                  
                  {estaAberta && (
                    <div className="divide-y divide-zinc-100 animate-in slide-in-from-top-2">
                      {produtosAgrupados[categoria].map(prod => (
                        <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center p-4 hover:bg-zinc-50 transition-colors gap-4">
                          <div className="flex items-center flex-1 gap-4">
                            <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200 relative">
                              {prod.image_url ? (
                                <img src={prod.image_url} className="w-full h-full object-cover" alt={prod.name}/>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={24}/></div>
                              )}
                              
                              {prod.upsell_item_ids && prod.upsell_item_ids.length > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-sm" title="Este produto tem Upsells">
                                  <Zap size={10} className="fill-white"/>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-zinc-900 line-clamp-1">{prod.name}</h4>
                              <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{prod.description || "Sem descrição"}</p>
                              {prod.variations && prod.variations.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {prod.variations.map((v: string, i: number) => (
                                    <span key={i} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{v}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço</p>
                              <span className="font-black text-indigo-600">R$ {Number(prod.price).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex gap-2 border-l border-zinc-100 pl-6">
                              <button onClick={() => abrirModal("produtos", prod)} className="p-2.5 text-zinc-400 hover:text-indigo-600 bg-white rounded-lg border border-zinc-200 shadow-sm transition-colors"><Edit3 size={16}/></button>
                              <button onClick={() => excluirItem(prod.id, "products")} className="p-2.5 text-zinc-400 hover:text-red-600 bg-white rounded-lg border border-zinc-200 shadow-sm transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ABA COMPLEMENTOS */}
      {activeTab === "complementos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complementos.length === 0 ? <p className="col-span-full py-10 text-center text-zinc-500 border-2 border-dashed border-zinc-200 rounded-2xl">Nenhum complemento cadastrado.</p> : complementos.map(comp => (
            <div key={comp.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-zinc-900 text-sm">{comp.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">Vinculado a: {comp.products?.name || "Produto excluído"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-1 rounded">Min: {comp.min_items}</span>
                  <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-1 rounded">Max: {comp.max_items}</span>
                  {comp.tipo_calculo && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded">{comp.tipo_calculo === 'maior' ? 'Soma Maior' : comp.tipo_calculo === 'media' ? 'Média' : 'Soma Normal'}</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-2 font-medium bg-zinc-50 px-2 py-1 rounded inline-block">{comp.complement_items?.length || 0} sabores/opções</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0 border-l border-zinc-100 pl-4">
                <button onClick={() => abrirModal("complementos", comp)} className="p-2 text-zinc-400 hover:text-blue-600 transition-colors bg-zinc-50 rounded-lg"><Edit3 size={16}/></button>
                <button onClick={() => excluirItem(comp.id, "complement_groups")} className="p-2 text-zinc-400 hover:text-red-600 transition-colors bg-zinc-50 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA CUPONS COM A TAG DE 1ª COMPRA */}
      {activeTab === "cupons" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cupons.length === 0 ? <p className="col-span-full py-10 text-center text-zinc-500 border-2 border-dashed border-zinc-200 rounded-2xl">Nenhum cupom cadastrado.</p> : cupons.map(cupom => (
            <div key={cupom.id} className={`bg-white rounded-2xl border ${cupom.active ? 'border-emerald-200 shadow-sm' : 'border-zinc-200 opacity-70'} p-5 flex flex-col gap-4 transition-all relative overflow-hidden`}>
              
              {cupom.first_purchase_only && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg tracking-wider">
                  1ª COMPRA
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Código do Cupom</p>
                  <h3 className="font-black text-2xl text-zinc-900 tracking-tight">{cupom.code}</h3>
                </div>
                <div className={`px-3 py-1 mt-1 rounded-lg font-black text-sm ${cupom.active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {cupom.desconto}% OFF
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-2">
                <button 
                  onClick={() => toggleCupomAtivo(cupom.id, cupom.active)}
                  className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${cupom.active ? 'text-emerald-600 hover:text-emerald-700' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  {cupom.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                  {cupom.active ? "Ativo na Loja" : "Inativo"}
                </button>
                
                <div className="flex gap-2">
                  <button onClick={() => abrirModal("cupons", cupom)} className="p-2 text-zinc-400 hover:text-blue-600 bg-zinc-50 rounded-lg transition-colors"><Edit3 size={16}/></button>
                  <button onClick={() => excluirItem(cupom.id, "coupons")} className="p-2 text-zinc-400 hover:text-red-600 bg-zinc-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL GERAL (Categorias, Produtos, Complementos, Cupons) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="font-black text-zinc-900">
                {itemEditando ? "Editar" : "Novo"} {activeTab === "categorias" ? "Categoria" : activeTab === "produtos" ? "Produto" : activeTab === "complementos" ? "Complemento" : "Cupom de Desconto"}
              </h2>
              <button onClick={fecharModal} className="text-zinc-400 hover:text-zinc-700"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              
              {/* UPLOAD FOTO (Apenas Produtos) */}
              {activeTab === "produtos" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Foto do Item</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-colors relative overflow-hidden">
                    {imagemPreview ? (
                      <img src={imagemPreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-zinc-400" />
                        <p className="text-xs text-zinc-500 font-bold">Clique para carregar foto</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFotoChange} />
                  </label>
                </div>
              )}

              {/* NOME GERAL */}
              {activeTab !== "cupons" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    {activeTab === "complementos" ? "Nome do Grupo" : "Nome"}
                  </label>
                  <input type="text" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-zinc-300 rounded-lg p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" placeholder={activeTab === "complementos" ? "Ex: Escolha os sabores, Adicionais..." : "Ex: Hambúrguer Clássico"} />
                </div>
              )}

              {/* CAMPOS CUPONS */}
              {activeTab === "cupons" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Código Promocional</label>
                    <input 
                      type="text" 
                      value={formData.code || ""} 
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s/g, '')})} 
                      className="w-full border border-zinc-300 rounded-lg p-3 text-lg font-black text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-600 uppercase" 
                      placeholder="Ex: BEMVINDO10" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Porcentagem de Desconto (%)</label>
                    <input 
                      type="number" 
                      min="1" max="100"
                      value={formData.desconto || ""} 
                      onChange={e => setFormData({...formData, desconto: parseFloat(e.target.value)})} 
                      className="w-full border border-zinc-300 rounded-lg p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-600" 
                      placeholder="Ex: 15" 
                    />
                  </div>

                  {/* NOVO: CHECKBOX DE PRIMEIRA COMPRA */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-4">
                    <input 
                      type="checkbox" 
                      id="first_purchase_check"
                      checked={formData.first_purchase_only || false}
                      onChange={e => setFormData({...formData, first_purchase_only: e.target.checked})}
                      className="mt-1 w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer shrink-0" 
                    />
                    <div>
                      <label htmlFor="first_purchase_check" className="font-bold text-blue-800 cursor-pointer flex items-center gap-1.5">Válido apenas para a 1ª Compra?</label>
                      <p className="text-xs text-blue-700/80 mt-0.5 leading-snug">Se marcado, o sistema bloqueará clientes que já têm pedidos cadastrados no número de WhatsApp de usarem este cupom.</p>
                    </div>
                  </div>
                </>
              )}

              {/* CAMPOS COMPLEMENTOS */}
              {activeTab === "complementos" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 mt-2">Como cobrar esse grupo?</label>
                  <select value={formData.tipo_calculo || "soma"} onChange={e => setFormData({...formData, tipo_calculo: e.target.value})} className="w-full border border-zinc-300 rounded-lg p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 bg-white">
                    <option value="soma">Soma normal (Ex: Hambúrguer + Bacon + Ovo)</option>
                    <option value="maior">Cobrar pelo mais caro (Ex: Pizza Meio a Meio)</option>
                    <option value="media">Cobrar valor proporcional (Média)</option>
                  </select>
                </div>
              )}

              {/* CAMPOS PRODUTOS */}
              {activeTab === "produtos" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                    <textarea rows={2} value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-zinc-300 rounded-lg p-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 resize-none" placeholder="Ingredientes e detalhes..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
                    <select value={formData.category_id || ""} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full border border-zinc-300 rounded-lg p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600">
                      <option value="">Selecione uma categoria...</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="border-t border-zinc-100 pt-4 mt-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Variações / Sabores (Opcional)</label>
                    <p className="text-xs text-zinc-400 mb-3">Ex: Carne, Frango, P. Se adicionado, o cliente terá que escolher um.</p>
                    
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        value={novaVariacao} 
                        onChange={e => setNovaVariacao(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && addVariacao()}
                        className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600" 
                        placeholder="Digite um sabor..." 
                      />
                      <button type="button" onClick={addVariacao} className="bg-zinc-800 hover:bg-zinc-900 text-white px-3 py-2 rounded-lg transition-colors">
                        <Plus size={18}/>
                      </button>
                    </div>

                    {formData.variations && formData.variations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.variations.map((varItem: string, idx: number) => (
                          <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-2">
                            {varItem}
                            <button type="button" onClick={() => removeVariacao(idx)} className="text-indigo-400 hover:text-red-500 transition-colors">
                              <X size={14}/>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* LISTA E VÍNCULO COMPLEMENTOS */}
              {activeTab === "complementos" && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mín. Escolhas</label>
                      <input type="number" min="0" value={formData.min_items || 0} onChange={e => setFormData({...formData, min_items: parseInt(e.target.value), is_required: parseInt(e.target.value) > 0})} className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Máx. Escolhas</label>
                      <input type="number" min="1" value={formData.max_items || 1} onChange={e => setFormData({...formData, max_items: parseInt(e.target.value)})} className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vincular a quais Produtos?</label>
                    <div className="border border-zinc-300 rounded-xl overflow-hidden">
                      <div className="bg-zinc-50 p-3 border-b border-zinc-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-700">
                          {produtosSelecionadosComp.length} selecionado(s)
                        </span>
                        <button type="button" onClick={handleToggleTodosProdutos} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                          {produtosSelecionadosComp.length === produtos.length ? "Desmarcar Todos" : "Marcar Todos"}
                        </button>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto p-2 space-y-1 bg-white">
                        {produtos.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-2">Nenhum produto cadastrado.</p>
                        ) : (
                          produtos.map(prod => (
                            <label key={prod.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-zinc-100">
                              <input 
                                type="checkbox" 
                                checked={produtosSelecionadosComp.includes(prod.id)} 
                                onChange={() => toggleProdutoComp(prod.id)} 
                                className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer" 
                              />
                              <span className="text-sm font-medium text-zinc-700 select-none line-clamp-1">{prod.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-100 pt-4 mt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Opções / Sabores deste Grupo</label>
                    
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        placeholder="Nome (Ex: Calabresa)" 
                        value={novoNomeItemComp} 
                        onChange={e => setNovoNomeItemComp(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && adicionarItemComp()}
                        className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600" 
                      />
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Preço (R$)" 
                        value={novoPrecoItemComp} 
                        onChange={e => setNovoPrecoItemComp(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && adicionarItemComp()}
                        className="w-24 border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600" 
                      />
                      <button type="button" onClick={adicionarItemComp} className="bg-zinc-800 hover:bg-zinc-900 text-white px-3 py-2 rounded-lg transition-colors">
                        <Plus size={18}/>
                      </button>
                    </div>
                    
                    {listaItensComp.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {listaItensComp.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg">
                            <span className="text-sm font-bold text-zinc-800">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-black text-emerald-600">+ R$ {Number(item.price).toFixed(2).replace('.', ',')}</span>
                              <button type="button" onClick={() => removerItemComp(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 text-center py-2 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                        Nenhum sabor/opção adicionado ainda.
                      </p>
                    )}
                  </div>

                </div>
              )}

              {/* SELETOR DE PREÇO E UPSELL PRODUTOS */}
              {activeTab === "produtos" && (
                <div className="border-t border-zinc-100 pt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Preço Base (R$)</label>
                    <input type="number" step="0.01" value={formData.price || ""} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-zinc-300 rounded-lg p-3 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600" placeholder="0.00" />
                  </div>
                  
                  <div className="border-t border-zinc-100 pt-4 mt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                      <Zap size={14} className="inline mr-1 text-orange-500 fill-orange-500" />
                      Compre Junto / Upsell (Opcional)
                    </label>
                    <p className="text-xs text-zinc-400 mb-3">Selecione quais produtos sugerir quando o cliente comprar este item.</p>

                    <div className="flex gap-2 mb-3">
                      <select
                        value={novoUpsellId}
                        onChange={e => setNovoUpsellId(e.target.value)}
                        className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                      >
                        <option value="">Selecione um produto...</option>
                        {produtos
                          .filter(p => p.id !== formData.id && !(formData.upsell_item_ids || []).includes(p.id))
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        }
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!novoUpsellId) return;
                          const atuais = formData.upsell_item_ids || [];
                          setFormData({ ...formData, upsell_item_ids: [...atuais, novoUpsellId] });
                          setNovoUpsellId("");
                        }}
                        className="bg-zinc-800 hover:bg-zinc-900 text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {(formData.upsell_item_ids && formData.upsell_item_ids.length > 0) && (
                      <div className="flex flex-col gap-2 mt-2">
                        {formData.upsell_item_ids.map((uId: string) => {
                          const prodRef = produtos.find(p => p.id === uId);
                          if (!prodRef) return null;
                          return (
                            <div key={uId} className="flex items-center justify-between bg-orange-50/50 border border-orange-100 p-2 rounded-lg">
                              <span className="text-sm font-bold text-orange-800">{prodRef.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    upsell_item_ids: formData.upsell_item_ids.filter((id: string) => id !== uId)
                                  });
                                }}
                                className="text-orange-400 hover:text-red-500 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3 shrink-0">
              <button onClick={fecharModal} className="px-5 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-zinc-200 transition-colors">Cancelar</button>
              <button onClick={salvarItem} disabled={salvando} className={`px-5 py-2.5 rounded-xl font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-70 ${activeTab === 'cupons' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {salvando ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}