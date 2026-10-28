import { CheckSquareOffset } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { HudCard } from './HudCard.tsx';

/** Placeholder panel for a section whose feature lands in a later milestone. */
export function ComingSoon({
  milestone,
  agent,
  title,
  items,
}: {
  milestone: string;
  agent: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <HudCard code={`STANDBY · ${milestone}`} title={title}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="w-32 shrink-0 sm:w-36">{agent}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted">这个模块会在 {milestone} 上线，届时这里会有：</p>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckSquareOffset aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-accent-text" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HudCard>
  );
}
