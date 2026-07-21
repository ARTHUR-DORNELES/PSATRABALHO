import { hsSearchAll } from './hubspot';

const PIPELINE = '904543067';
const PRODUTO = 'As 50 palestras mais bem avaliadas da PSA';
const STAGE = {
  concluido: '1372708683',
  aguardando: '1372708679',
  perdido: '1372708684',
};

export type DailyEntry = { date: string; byStatus: Record<string, number> };

export type Snapshot = {
  generatedAt: string;
  concluido: number;
  abandonou: number;
  aguardando: number;
  cancelado: number;
  receitaTotal: number;
  ticketMedio: number;
  taxaConversao: number;
  daily: DailyEntry[];
};

// Converte datetime UTC → data no fuso de Brasília (YYYY-MM-DD).
function brtDay(iso: string): string | null {
  const ms = Date.parse(iso);
  if (isNaN(ms)) return null;
  const brt = new Date(ms - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

let memCache: { data: Snapshot; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function fetchSnapshot(token: string, force = false): Promise<Snapshot> {
  if (!force && memCache && Date.now() - memCache.ts < CACHE_TTL) {
    return memCache.data;
  }

  const deals = await hsSearchAll(token, 'deals', {
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline', operator: 'EQ', value: PIPELINE },
        { propertyName: 'tbschool__produto_de_interesse', operator: 'EQ', value: PRODUTO },
      ],
    }],
    properties: ['dealstage', 'amount', 'amount_in_home_currency', 'createdate'],
  });

  let concluido = 0, abandonou = 0, aguardando = 0, cancelado = 0, receitaTotal = 0;
  const dailyMap: Record<string, Record<string, number>> = {};

  for (const d of deals) {
    const st = d.properties.dealstage;
    const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
    let dayKey: string | null = null;

    if (st === STAGE.concluido) {
      concluido++;
      receitaTotal += amt;
      dayKey = 'concluido';
    } else if (st === STAGE.aguardando) {
      aguardando++;
      dayKey = 'aguardando';
    } else if (st === STAGE.perdido) {
      cancelado++;
    } else {
      abandonou++;
      dayKey = 'abandonou';
    }

    const day = brtDay(d.properties.createdate);
    if (dayKey && day) {
      if (!dailyMap[day]) dailyMap[day] = {};
      dailyMap[day][dayKey] = (dailyMap[day][dayKey] || 0) + 1;
    }
  }

  const total = concluido + abandonou + aguardando;
  const data: Snapshot = {
    generatedAt: new Date().toISOString(),
    concluido,
    abandonou,
    aguardando,
    cancelado,
    receitaTotal,
    ticketMedio: concluido > 0 ? receitaTotal / concluido : 0,
    taxaConversao: total > 0 ? concluido / total : 0,
    daily: Object.entries(dailyMap)
      .map(([date, byStatus]) => ({ date, byStatus }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };

  memCache = { data, ts: Date.now() };
  return data;
}
