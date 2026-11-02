import { useEffect, useRef, useState } from 'react';
import type { User, View } from '../types';
import { roleLabel } from '../lib/labels';
import { useT, LanguageToggle } from '../i18n';
import { Icon } from '../icons';

function useIsDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return matches;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

interface NavItem {
  id: string;
  label: string;
  target: View;
  active: boolean;
}

export default function Header(props: {
  user: User;
  view: View;
  onNavigate: (view: View) => void;
  onAddCar: () => void;
  onLogout: () => void;
}) {
  const { user, view, onNavigate, onAddCar, onLogout } = props;
  const t = useT();
  const isDesktop = useIsDesktop();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const isOwner = user.role === 'owner';
  const role = roleLabel(t, user.role);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const items: NavItem[] = isOwner
    ? [
        { id: 'nav-dashboard', label: t('Dashboard'), target: 'dashboard', active: view === 'dashboard' },
        { id: 'nav-fleet', label: t('My fleet'), target: 'fleet', active: view === 'fleet' },
      ]
    : [
        { id: 'nav-browse', label: t('Browse cars'), target: 'home', active: view === 'home' || view === 'details' },
        { id: 'nav-saved', label: t('Saved cars'), target: 'saved', active: view === 'saved' },
        { id: 'nav-bookings', label: t('My bookings'), target: 'bookings', active: view === 'bookings' },
      ];

  const go = (target: View) => {
    setMobileOpen(false);
    setAccountOpen(false);
    onNavigate(target);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-sm">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <button
          type="button"
          onClick={() => go(isOwner ? 'dashboard' : 'home')}
          className="-my-px flex shrink-0 items-center self-stretch bg-primary px-3 text-lg font-extrabold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-6 sm:text-xl"
        >
          Wheels2Go
        </button>

        {isDesktop && (
          <nav aria-label={t('Main menu')} className="ml-10 flex items-center gap-7">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={item.id}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => go(item.target)}
                className={`relative whitespace-nowrap rounded-md py-6 text-[15px] font-medium hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  item.active
                    ? 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                    : 'text-text'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-5">
          {isOwner && (
            <button
              type="button"
              data-testid="add-car-btn"
              onClick={() => {
                setMobileOpen(false);
                setAccountOpen(false);
                onAddCar();
              }}
              className="flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-success px-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-5"
            >
              <span aria-hidden="true">+</span>
              <span className="sr-only sm:not-sr-only">{t('Add car')}</span>
            </button>
          )}

          <LanguageToggle />

          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              data-testid="account-menu-btn"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:pr-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initials(user.name)}
              </span>
              <span data-testid="current-user" className="sr-only text-left xl:not-sr-only">
                <span className="block text-sm font-semibold text-text">{user.name}</span>{' '}
                <span className="block text-xs text-text-muted">{role}</span>
              </span>
              <Icon name="chevron" className="hidden h-4 w-4 text-text-muted sm:block" />
            </button>
            {accountOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg"
              >
                <div className="px-3 py-2">
                  <p className="break-words text-sm font-semibold text-text">{user.name}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {role}
                  </span>
                </div>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  data-testid="logout-btn"
                  onClick={() => {
                    setAccountOpen(false);
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {t('Log out')}
                </button>
              </div>
            )}
          </div>

          {!isDesktop && (
            <button
              type="button"
              data-testid="mobile-menu-btn"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu-panel"
              aria-label={t('Menu')}
              onClick={() => setMobileOpen((o) => !o)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span aria-hidden="true" className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 bg-text" />
                <span className="block h-0.5 w-5 bg-text" />
                <span className="block h-0.5 w-5 bg-text" />
              </span>
            </button>
          )}
        </div>
      </div>

      {!isDesktop && mobileOpen && (
        <nav
          id="mobile-menu-panel"
          aria-label={t('Main menu')}
          className="border-t border-border bg-surface px-3 py-3 shadow-md sm:px-6"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={item.id}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => go(item.target)}
                className={`block w-full whitespace-normal rounded-lg px-3 py-3 text-left text-[15px] font-medium hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  item.active ? 'bg-primary/5 text-primary' : 'text-text'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
