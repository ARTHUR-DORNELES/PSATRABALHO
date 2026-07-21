// =====================================================================
// Formatação pt-BR (números, moeda, %, datas)
// =====================================================================

const nf = new Intl.NumberFormat("pt-BR");
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const cf = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const cf2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return nf.format(Math.round(n));
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return nf1.format(n);
}

export function fmtCurrency(n: number | null | undefined, cents = false): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (cents ? cf2 : cf).format(n);
}

/** Recebe uma fração (0.234) e devolve "23,4%". */
export function fmtPct(frac: number | null | undefined, digits = 1): string {
  if (frac == null || Number.isNaN(frac)) return "—";
  return `${(frac * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

/** Lift relativo com sinal: +12,5% / -3,0%. */
export function fmtLift(frac: number | null | undefined, digits = 1): string {
  if (frac == null || Number.isNaN(frac)) return "—";
  const sign = frac > 0 ? "+" : "";
  return `${sign}${(frac * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
  })}%`;
}

/** Formata um valor conforme o tipo de métrica (RATE/COUNT/CURRENCY/RATIO). */
export function fmtByKind(
  value: number | null | undefined,
  kind: string,
  unit?: string | null,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (kind === "RATE") return fmtPct(value);
  if (kind === "CURRENCY") return fmtCurrency(value);
  if (kind === "RATIO") return unit === "BRL" ? fmtCurrency(value, true) : fmtNum(value);
  return fmtInt(value);
}

/** "junho de 2026" a partir de "2026-06-01" ou "2026-06". */
export function fmtMonth(ref: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(ref);
  if (!m) return ref;
  return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  let date: Date;
  if (typeof d === "string") {
    // Datas "date-only" (YYYY-MM-DD) devem ser locais, não UTC — senão
    // o fuso -03:00 mostra o dia anterior.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  } else {
    date = d;
  }
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "há 3 dias", "há 2h" — para timestamps de sync. */
export function fmtRelative(d: string | Date | null | undefined, now: Date): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = now.getTime() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.round(h / 24);
  return `há ${days}d`;
}
