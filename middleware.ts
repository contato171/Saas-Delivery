import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Por enquanto, ele apenas deixa a requisição passar, 
  // mas já com a trava de economia configurada abaixo.
  // Futuramente, colocaremos a proteção de login do Supabase aqui.
  return NextResponse.next()
}

// A TRAVA DE ECONOMIA DA VERCEL
export const config = {
  matcher: [
    /*
     * Ignora o middleware para arquivos estáticos, imagens e ícones.
     * Isso impede que a Vercel cobre uma "Invocação de Função" para cada foto carregada.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}