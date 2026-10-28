import { useEffect, type ReactNode } from 'react';

export function PageHeader({ code, title, children }: { code: string; title: string; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · 热点监控`;
  }, [title]);

  return (
    <header className="mb-6">
      <p className="font-mono text-xs tracking-[0.25em] text-accent-text">// {code}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-wide uppercase sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{children}</p>}
    </header>
  );
}
