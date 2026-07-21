import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PSA · UTM Observability',
  description: 'Cobertura, conformidade e buracos de UTM no HubSpot da PSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
