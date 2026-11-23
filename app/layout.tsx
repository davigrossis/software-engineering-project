import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderProvider } from "../components/header/HeaderContext";
import Navbar from "../components/navbar";
import HeaderContent from "../components/header/HeaderContent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COOPAF - Sistema de Gestão",
  description: "Gestão de clientes, fornecedores, produtos, estoque, aquisições e pedidos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-hidden`}
        >
        <HeaderProvider>
          <header>
            <Navbar />
            <HeaderContent />
          </header>
          {children}
        </HeaderProvider>
      </body>
    </html>
  );
}
