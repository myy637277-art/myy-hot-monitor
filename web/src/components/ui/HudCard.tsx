import type { ReactNode } from 'react';

interface HudCardProps {
  code?: string;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'article' | 'div';
}

export function HudCard({ code, title, action, children, className = '', bodyClassName = '', as: Tag = 'section' }: HudCardProps) {
  return (
    <Tag className={`hud-frame ${className}`}>
      <div className={`hud-body relative p-4 sm:p-5 ${bodyClassName}`}>
        <span aria-hidden="true" className="absolute top-0 left-0 h-0.5 w-8 bg-accent" />
        {(code || title || action) && (
          <header className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {code && <p className="font-mono text-[11px] tracking-[0.2em] text-accent-text uppercase">// {code}</p>}
              {title && <h2 className="mt-0.5 font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>}
            </div>
            {action}
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
