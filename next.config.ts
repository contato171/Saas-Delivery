import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Desliga a otimização paga de imagens da Vercel globalmente. 
     As imagens serão carregadas direto do Supabase, economizando muito seu limite. */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;