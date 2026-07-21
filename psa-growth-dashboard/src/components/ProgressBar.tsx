import clsx from "clsx";
import { toneColor, type Tone } from "@/lib/ui";

/** Barra horizontal 0..100% com cor por tom. */
export function ProgressBar({
  pct,
  tone = "accent",
  className,
}: {
  pct: number | null | undefined;
  tone?: Tone;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, pct ?? 0));
  // O tom "accent" usa o gradiente verde→azul da marca; os demais, cor sólida.
  const fill =
    tone === "accent"
      ? { width: `${v}%`, backgroundImage: "linear-gradient(90deg, #00C86F, #2E8BFF)" }
      : { width: `${v}%`, backgroundColor: toneColor(tone) };
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div className="h-full rounded-full transition-all" style={fill} />
    </div>
  );
}
