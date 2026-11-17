/** Back-office roles, from least to most powerful. USER is every bidder's role and grants nothing here. */
export type Role = 'USER' | 'SUPPORT' | 'FINANCE' | 'ADMIN' | 'SUPER_ADMIN';

export const STAFF_ROLES: readonly Role[] = ['SUPPORT', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'];

export const isStaff = (roles: readonly string[]): boolean =>
  roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));

/**
 * Whether someone with `roles` may do something that needs any of `needed`. SUPER_ADMIN may do everything, as on
 * the server. This only decides what is shown: the server checks every request again.
 */
export function can(roles: readonly string[] | undefined, ...needed: Role[]): boolean {
  if (!roles) return false;
  return roles.includes('SUPER_ADMIN') || needed.some((role) => roles.includes(role));
}

/** What each part of the back office needs, mirroring the server's rules. */
export const NEEDS = {
  read: ['SUPPORT', 'FINANCE', 'ADMIN'],
  dashboard: ['FINANCE', 'ADMIN'],
  manageCatalog: ['ADMIN'],
  judgeWinners: ['ADMIN'],
  delivery: ['SUPPORT', 'ADMIN'],
  accountStatus: ['ADMIN'],
  accountHelp: ['SUPPORT', 'ADMIN'],
  roles: ['SUPER_ADMIN'],
  money: ['FINANCE'],
  audit: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Bidder',
  SUPPORT: 'Support',
  FINANCE: 'Finance',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super admin',
};
