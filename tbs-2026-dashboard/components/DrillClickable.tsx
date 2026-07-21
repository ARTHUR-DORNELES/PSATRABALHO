'use client';
import type { ReactNode } from 'react';
import { useDrill } from './DrillProvider';
import type { DrillQuery } from '@/lib/drill';

export function DrillClickable({
  query,
  children,
  className,
  asDiv,
}: {
  query: DrillQuery;
  children: ReactNode;
  className?: string;
  asDiv?: boolean;
}) {
  const { open } = useDrill();
  const Tag = (asDiv ? 'div' : 'button') as 'div' | 'button';
  return (
    <Tag
      onClick={() => open(query)}
      className={`text-left cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-tbs-orange focus-visible:ring-offset-2 ${className || ''}`}
    >
      {children}
    </Tag>
  );
}
