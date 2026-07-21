import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Growth — Painel de Experimentação",
  description:
    "Centro de comando de Growth: experimentos, metas, benchmarks e aquisição de leads.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Páginas "bare" (sem sidebar): login. Lê o pathname injetado pelo middleware.
  const pathname = headers().get("x-pathname") ?? "";
  const bare = pathname.startsWith("/login");

  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-psa-bg font-sans text-psa-ice antialiased">
        {bare ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
