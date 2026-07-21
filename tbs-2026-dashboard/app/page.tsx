import { Header } from '@/components/Header';
import { DashboardTabs } from '@/components/DashboardTabs';
import { ImprovementBanner } from '@/components/ImprovementBanner';
import { DrillProvider } from '@/components/DrillProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getDashboardData } from '@/lib/data';
import { getMetaAds } from '@/lib/meta-ads';
import { getWhatsappCosts } from '@/lib/whatsapp-costs';
import { getRefAdsDaily } from '@/lib/media-ref';
// Google Ads desvinculado a pedido — mídia paga é só Meta.

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // a montagem do snapshot faz muitas chamadas ao HubSpot

export default async function Page() {
  const data = await getDashboardData();
  const metaAds = await getMetaAds();
  const whatsapp = await getWhatsappCosts();
  const googleAds = undefined; // Google Ads desvinculado
  // Investido real do Pace vem do painel de referência (tbs-meta-ads.vercel.app), não do fetch acima.
  const refAds = await getRefAdsDaily();
  return (
    <ThemeProvider defaultTheme="dark">
      <DrillProvider>
        <div className="min-h-screen">
          <Header data={data} />
          <main className="max-w-[1280px] mx-auto px-8 py-8">
            <ImprovementBanner />
            <DashboardTabs data={data} meta={metaAds} google={googleAds} refAds={refAds} whatsapp={whatsapp} />
            <footer className="text-center text-[11px] text-tbs-mute-light dark:text-tbs-mute pt-6 pb-12 font-mono uppercase tracking-widest">
              TBS 2026 · 3ª edição · dashboard ao vivo · clique em qualquer número
            </footer>
          </main>
        </div>
      </DrillProvider>
    </ThemeProvider>
  );
}
