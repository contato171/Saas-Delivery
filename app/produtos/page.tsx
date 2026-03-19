import PlanosPricing from "@/components/PlanosPricing";
import { ArrowRight, CheckCircle2, Star, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans text-zinc-900">
      {/* HERO SECTION - Onde vendemos a Transformação */}
      <section className="relative px-6 pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-8 animate-bounce">
            <Zap size={16} fill="currentColor" />
            Lançamento: A única plataforma com Marketing IA do Brasil
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            Transforme seu Delivery em uma <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Máquina de Vendas Automática
            </span>
          </h1>
          
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Muito mais que um cardápio digital. Tenha sua própria agência de marketing 
            com inteligência artificial para atrair clientes todos os dias em 2 cliques.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#planos" className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200">
              Começar agora <ArrowRight size={20} />
            </Link>
            <Link href="/login" className="w-full sm:w-auto bg-white border-2 border-zinc-200 text-zinc-900 px-8 py-5 rounded-2xl font-black text-lg hover:bg-zinc-50 transition-all">
              Acessar Painel
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 grayscale opacity-50 overflow-hidden select-none">
            <div className="flex items-center gap-1 font-bold italic text-2xl tracking-tighter">FACEBOOK ADS</div>
            <div className="flex items-center gap-1 font-bold italic text-2xl tracking-tighter">INSTAGRAM</div>
            <div className="flex items-center gap-1 font-bold italic text-2xl tracking-tighter">WHATSAPP</div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE PREÇOS - Onde exibimos os novos planos */}
      <section id="planos">
        <PlanosPricing />
      </section>

      {/* FOOTER SIMPLES */}
      <footer className="py-12 border-t border-zinc-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-400 text-sm font-medium">
          <p>© 2026 SaaS Nexus Delivery. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}