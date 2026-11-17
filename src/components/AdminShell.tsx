import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROLE_LABELS, type Role } from '../auth/roles';
import { ICONS, useNavLinks } from './navLinks';
import { useAuth } from '../auth/useAuth';
import { config } from '../config';
import { cx } from '../lib/cx';
import { useOnline } from '../lib/useOnline';
import { ErrorBoundary } from './ErrorBoundary';

export function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cx('shrink-0', className)}
    >
      <path d={d} />
    </svg>
  );
}

export function AdminShell() {
  const { user, signOut } = useAuth();
  const links = useNavLinks();
  const online = useOnline();
  const { pathname } = useLocation();
  // The menu belongs to the page it was opened on: following a link closes it.
  const [menuOn, setMenuOn] = useState<string | null>(null);
  const menuOpen = menuOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOn(open ? pathname : null);

  const nav = (
    <nav aria-label="Back office" className="flex flex-col gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'bg-ink text-white' : 'text-slate-700 hover:bg-slate-200/70',
            )
          }
        >
          <Icon d={ICONS[link.icon]} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );

  const account = user && (
    <div className="rounded-3xl bg-slate-100 p-4 text-sm">
      <p className="font-semibold break-words">{user.fullName || user.phoneNumber}</p>
      <p className="text-xs text-slate-500">{user.phoneNumber}</p>
      <p className="mt-2 flex flex-wrap gap-1">
        {user.roles
          .filter((r) => r !== 'USER')
          .map((r) => (
            <span key={r} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">
              {ROLE_LABELS[r as Role] ?? r}
            </span>
          ))}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 w-full rounded-full bg-white px-4 py-2 font-semibold hover:bg-slate-200"
      >
        Sign out
      </button>
    </div>
  );

  const brand = (
    <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      {config.appName}
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        {brand}
        <div className="flex-1">{nav}</div>
        {account}
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 rounded-b-4xl bg-white px-4 shadow-[0_2px_12px_rgb(22_21_19/0.05)] lg:hidden">
        {brand}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Menu'}</span>
          <Icon d={menuOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16'} />
        </button>
      </header>
      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-10 space-y-4 overflow-y-auto bg-cream p-4 lg:hidden"
        >
          {nav}
          {account}
        </div>
      )}

      <div className="min-w-0">
        {!online && (
          <p role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
            You are offline. What you see may be out of date.
          </p>
        )}
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 outline-none lg:px-8">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
