import { fetchSnapshot } from '@/lib/data';
import { Dashboard } from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Configuração necessária</h1>
          <p className="text-subtle text-sm">
            Defina a variável de ambiente <code className="text-accent">HUBSPOT_TOKEN</code> no arquivo{' '}
            <code className="text-accent">.env.local</code> e reinicie o servidor.
          </p>
        </div>
      </main>
    );
  }

  let data;
  try {
    data = await fetchSnapshot(token);
  } catch (e) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Erro ao carregar dados</h1>
          <p className="text-subtle text-sm">{String(e)}</p>
        </div>
      </main>
    );
  }

  return <Dashboard initialData={data} />;
}
