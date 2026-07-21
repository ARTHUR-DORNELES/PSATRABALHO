import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '50 Palestras · PSA Dashboard',
  description: 'Painel de vendas — As 50 palestras mais bem avaliadas da PSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
