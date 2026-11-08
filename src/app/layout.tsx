import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import OnboardingModal from "@/components/OnboardingModal";
import BottomTabs from "@/components/BottomTabs";
import BankrollBadge from "@/components/BankrollBadge";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GO4ALL - Copa 2026",
  description: "Painel de controle do bolão de amigos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-neutral-950 text-neutral-100 min-h-screen pb-20`}>
        <UserProvider>
          {/* Header Global Simples com Saldo */}
          <header className="bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-800/50 p-4 sticky top-0 z-40">
            <div className="max-w-md mx-auto flex justify-between items-center">
              <Link href="/jogos" className="hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold tracking-tight text-white">GO<span className="text-blue-600">4</span>ALL</h1>
              </Link>
              <BankrollBadge />
            </div>
          </header>

          {/* Conteúdo da Página */}
          <main className="max-w-md mx-auto p-4 pb-28">
            {children}
          </main>

          {/* Componentes Globais */}
          <OnboardingModal />
          <BottomTabs />
        </UserProvider>
      </body>
    </html>
  );
}
