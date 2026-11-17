import { can, NEEDS, type Role } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

export const ICONS = {
  dashboard: 'M3 3h7v9H3zm11 0h7v5h-7zm0 9h7v9h-7zM3 16h7v5H3z',
  auctions: 'M14 13 5 22l-3-3 9-9m3-7 7 7m-9-4 6 6m-7-1 5-5',
  products: 'M21 8 12 3 3 8v8l9 5 9-5zm-9 13V12m9-4-9 4-9-4',
  winners: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  deposits:
    'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zm13 7h.01',
  ledger: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM9 7h7m-7 4h5',
  audit: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
} as const;

const LINKS: {
  to: string;
  label: string;
  icon: keyof typeof ICONS;
  needs: readonly Role[];
  end?: boolean;
}[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', needs: NEEDS.dashboard, end: true },
  { to: '/auctions', label: 'Auctions', icon: 'auctions', needs: NEEDS.read },
  { to: '/products', label: 'Products', icon: 'products', needs: NEEDS.read },
  { to: '/winners', label: 'Winners', icon: 'winners', needs: NEEDS.read },
  { to: '/users', label: 'Users', icon: 'users', needs: NEEDS.read },
  { to: '/deposits', label: 'Deposits', icon: 'deposits', needs: NEEDS.read },
  { to: '/ledger', label: 'Ledger check', icon: 'ledger', needs: NEEDS.money },
  { to: '/audit', label: 'Audit log', icon: 'audit', needs: NEEDS.audit },
  { to: '/security', label: 'Security events', icon: 'security', needs: NEEDS.audit },
];

/** The links this staff member may use. */
export function useNavLinks() {
  const { user } = useAuth();
  return LINKS.filter((link) => can(user?.roles, ...link.needs));
}
