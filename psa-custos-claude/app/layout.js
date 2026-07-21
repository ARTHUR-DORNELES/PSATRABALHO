import "./globals.css";

export const metadata = {
  title: "PSA · Custos & Uso Claude",
  description: "Dashboard de custos e utilização reais de Claude/Claude Code do grupo PSA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
