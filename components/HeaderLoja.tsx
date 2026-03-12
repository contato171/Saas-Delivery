export default function HeaderLoja({ nome }: { nome: string }) {
  return (
    <div className="bg-white pb-4 shadow-sm">
      {/* Capa da Loja (Placeholder cinza por enquanto) */}
      <div className="h-28 bg-zinc-200 w-full relative">
        {/* Logo da Loja flutuando em cima da capa */}
        <div className="absolute -bottom-6 left-4 w-16 h-16 bg-white rounded-full border border-zinc-100 shadow-md flex items-center justify-center overflow-hidden">
           <span className="text-2xl">🍔</span>
        </div>
      </div>
      
      {/* Informações da Loja */}
      <div className="pt-8 px-4">
        <h1 className="text-xl font-bold text-zinc-900">{nome}</h1>
        <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
          <span className="text-yellow-500 font-bold">★ 4.9</span> • Lanches • 30-45 min
        </p>
      </div>
    </div>
  );
}