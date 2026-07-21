import Link from 'next/link';
import clsx from 'clsx';
import { OBJECT_LABELS, OBJECT_TYPES, type ObjectType, type Period } from '@/lib/data';

export function ObjectTabs({ current, period }: { current: ObjectType; period: Period }) {
  return (
    <div className="inline-flex items-center bg-white border border-psa-line rounded-full p-1 gap-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {OBJECT_TYPES.map((obj) => (
        <Link
          key={obj}
          href={`/?period=${period}&obj=${obj}`}
          prefetch={false}
          className={clsx(
            'px-4 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap uppercase tracking-wider',
            current === obj
              ? 'bg-psa-accent text-white'
              : 'text-psa-mute hover:text-psa-ink',
          )}
        >
          {OBJECT_LABELS[obj]}
        </Link>
      ))}
    </div>
  );
}
