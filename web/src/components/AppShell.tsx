import { NavLink, Outlet } from 'react-router';
import { navItems } from '../lib/nav.ts';
import { useHealth } from '../lib/useHealth.ts';
import { StatusChip } from './StatusChip.tsx';

function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0">
        <path d="M4 4 H28 L28 20 L20 28 H4 Z" fill="#ff4655" />
        <circle cx="15" cy="15" r="6" fill="none" stroke="#0f1923" strokeWidth="2.5" />
        <path d="M15 5 V10 M15 20 V25 M5 15 H10 M20 15 H25" stroke="#0f1923" strokeWidth="2.5" />
      </svg>
      {withText && (
        <span className="leading-none">
          <span className="block font-display text-lg font-bold tracking-wider uppercase">Hot Monitor</span>
          <span className="block text-[11px] tracking-[0.3em] text-muted">热点监控</span>
        </span>
      )}
    </span>
  );
}

const linkBase =
  'group flex items-center gap-3 border-l-2 transition-colors duration-150 hover:bg-white/5 hover:text-bone';

export function AppShell() {
  const health = useHealth();

  return (
    <div className="min-h-dvh sm:grid sm:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 bg-accent px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        跳到主要内容
      </a>

      <aside className="hud-stripes sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink-2 sm:flex">
        <NavLink to="/" aria-label="热点监控首页" className="flex h-20 items-center justify-center lg:justify-start lg:px-5">
          <span className="lg:hidden">
            <Logo withText={false} />
          </span>
          <span className="hidden lg:block">
            <Logo />
          </span>
        </NavLink>
        <nav aria-label="主导航" className="flex-1 py-2">
          <ul className="space-y-1">
            {navItems.map(({ to, label, code, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `${linkBase} min-h-14 flex-col justify-center px-2 text-[11px] lg:flex-row lg:justify-start lg:px-5 lg:text-sm ${
                      isActive ? 'border-accent bg-white/5 text-bone' : 'border-transparent text-muted'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon aria-hidden="true" size={24} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-accent-text' : ''} />
                      <span className="font-medium">{label}</span>
                      <span aria-hidden="true" className="hidden font-mono text-[10px] tracking-widest text-muted lg:ml-auto lg:inline">
                        {code.slice(0, 2)}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden border-t border-line p-4 lg:block">
          <StatusChip state={health} />
        </div>
        <div className="flex justify-center border-t border-line p-3 lg:hidden">
          <StatusChip state={health} compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur sm:hidden">
          <NavLink to="/" aria-label="热点监控首页">
            <Logo />
          </NavLink>
          <StatusChip state={health} compact />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 outline-none sm:px-8 sm:pt-10 sm:pb-12">
          <Outlet context={health} />
        </main>
      </div>

      <nav
        aria-label="底部导航"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] transition-colors duration-150 ${
                    isActive ? 'border-accent text-bone' : 'border-transparent text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden="true" size={22} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-accent-text' : ''} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
