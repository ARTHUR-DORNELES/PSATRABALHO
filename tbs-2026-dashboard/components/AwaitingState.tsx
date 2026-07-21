export function AwaitingState({
  title,
  hint,
  compact,
}: {
  title: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`text-center rounded-lg border-2 border-dashed border-tbs-line ${
        compact ? 'py-6 px-4' : 'py-12 px-6'
      }`}
    >
      <div className={compact ? 'text-xl mb-2' : 'text-3xl mb-3'}>⏳</div>
      <div className={`display uppercase text-tbs-mute ${compact ? 'text-sm' : 'text-base'}`}>{title}</div>
      <div className="text-xs text-tbs-mute mt-2 max-w-md mx-auto">
        {hint || 'Aguardando início das inscrições em 01/06/2026'}
      </div>
    </div>
  );
}
