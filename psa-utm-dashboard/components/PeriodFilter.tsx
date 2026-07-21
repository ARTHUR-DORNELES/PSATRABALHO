import Link from 'next/link';
import clsx from 'clsx';
import { PERIOD_LABELS, PERIODS_ORDER, type ObjectType, type Period } from '@/lib/data';

export function PeriodFilter({ current, objectType }: { current: Period; objectType: ObjectType }) {
  return (
    <div className="inline-flex items-center bg-white border border-psa-line rounded-full p-1 gap-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {PERIODS_ORDER.map((value) => (
        <Link
          key={value}
          href={`/?period=${value}&obj=${objectType}`}
          prefetch={false}
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
            current === value
              ? 'bg-psa-ink text-white'
              : 'text-psa-mute hover:text-psa-ink',
          )}
        >
          {PERIOD_LABELS[value]}
        </Link>
      ))}
    </div>
  );
}
