import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../components/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS Delivery",
  description: "A sua máquina de vendas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Aqui nós abraçamos o site inteiro com a memória da sacola! */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}