import clsx from "clsx";
import { toneClasses, type Tone } from "@/lib/ui";

export function Pill({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("psa-pill", toneClasses(tone), className)}>{children}</span>
  );
}
