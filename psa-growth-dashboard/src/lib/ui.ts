// =====================================================================
// Helpers de apresentação — rótulos pt-BR e tons de cor por estado.
// Puro (sem JSX), reaproveitável em server e client components.
// =====================================================================
import type { ChannelKind, ExperimentStatus, GoalStatus, Recommendation } from "./types";

export type Tone = "success" | "warning" | "danger" | "info" | "muted" | "accent";

export const STATUS_LABEL: Record<ExperimentStatus, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  WON: "Oficializado",
  LOST: "Descartado",
  INCONCLUSIVE: "Inconclusivo",
};

export const STATUS_TONE: Record<ExperimentStatus, Tone> = {
  DRAFT: "muted",
  RUNNING: "info",
  PAUSED: "muted",
  WON: "success",
  LOST: "danger",
  INCONCLUSIVE: "muted",
};

export const RECO_LABEL: Record<Recommendation, string> = {
  DECLARE_WINNER: "Pronto para oficializar",
  STOP_NO_EFFECT: "Encerrar — sem efeito",
  NEEDS_MORE_DATA: "Precisa de mais dados",
  KEEP_RUNNING: "Manter rodando",
  INCONCLUSIVE: "Inconclusivo (prazo vencido)",
};

export const RECO_TONE: Record<Recommendation, Tone> = {
  DECLARE_WINNER: "success",
  STOP_NO_EFFECT: "danger",
  NEEDS_MORE_DATA: "warning",
  KEEP_RUNNING: "info",
  INCONCLUSIVE: "muted",
};

export const CHANNEL_LABEL: Record<ChannelKind, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  ORGANIC_CONTENT: "Orgânico / LP",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  OTHER: "Outro",
};

// Cor por canal — usada nos chips do calendário e legendas.
export const CHANNEL_COLOR: Record<ChannelKind, string> = {
  EMAIL: "#2E8BFF",
  WHATSAPP: "#22C55E",
  ORGANIC_CONTENT: "#2DD4BF",
  META_ADS: "#8B5CF6",
  GOOGLE_ADS: "#F59E0B",
  OTHER: "#8296B0",
};

// Frentes / linhas de negócio (B2B, B2C, TBS...). Definem cor e filtro no
// calendário. Guardadas em experiments.meta.front (sem coluna dedicada).
export type Front = { key: string; name: string; color: string };
export const FRONTS: Front[] = [
  { key: "b2b", name: "B2B", color: "#2E8BFF" },
  { key: "b2c", name: "B2C", color: "#F59E0B" },
  { key: "tbs", name: "TBS", color: "#00C86F" },
];
export const NO_FRONT_COLOR = "#8296B0";
export function frontColor(key: string | null | undefined): string {
  return FRONTS.find((f) => f.key === key)?.color ?? NO_FRONT_COLOR;
}
export function frontName(key: string | null | undefined): string {
  return FRONTS.find((f) => f.key === key)?.name ?? "Sem frente";
}

export const GOAL_LABEL: Record<GoalStatus, string> = {
  ON_TRACK: "No ritmo",
  AT_RISK: "Em risco",
  OFF_TRACK: "Fora da meta",
  ACHIEVED: "Atingida",
};

export const GOAL_TONE: Record<GoalStatus, Tone> = {
  ON_TRACK: "info",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
  ACHIEVED: "success",
};

/** Classes Tailwind para um pill por tom. */
export function toneClasses(tone: Tone): string {
  switch (tone) {
    case "success":
      return "bg-psa-success/15 text-psa-success";
    case "warning":
      return "bg-psa-warning/15 text-psa-warning";
    case "danger":
      return "bg-psa-danger/15 text-psa-danger";
    case "info":
      return "bg-psa-brand/25 text-blue-200";
    case "accent":
      return "bg-psa-accent/15 text-psa-accent";
    default:
      return "bg-white/5 text-psa-muted";
  }
}

/** Cor sólida (hex) por tom — usada em barras e gráficos. */
export function toneColor(tone: Tone): string {
  switch (tone) {
    case "success":
      return "#22C55E";
    case "warning":
      return "#F59E0B";
    case "danger":
      return "#F43F5E";
    case "info":
      return "#2E8BFF";
    case "accent":
      return "#00C86F";
    default:
      return "#8296B0";
  }
}
