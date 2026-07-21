import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TBS 2026 · 3ª edição · Dashboard',
  description: 'The Best Speaker 2026 — painel de inscrições, canais e representação regional (HubSpot ao vivo)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
