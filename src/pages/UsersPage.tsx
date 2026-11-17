import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { when } from '../admin/format';
import {
  FilterBar,
  Loaded,
  PageHeader,
  Pill,
  SearchFilter,
  SelectFilter,
  StatusPill,
  Table,
} from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { ROLE_LABELS, type Role } from '../auth/roles';
import { Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

const STATUSES = ['ACTIVE', 'SUSPENDED', 'BLOCKED'] as const;
const ROLES = ['USER', 'SUPPORT', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'] as const;

export function RolePills({ roles }: { roles: string[] }) {
  const staff = roles.filter((r) => r !== 'USER');
  if (staff.length === 0) return <span className="text-slate-500">Bidder</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {staff.map((r) => (
        <Pill key={r} tone={r === 'SUPER_ADMIN' ? 'dark' : 'gold'}>
          {ROLE_LABELS[r as Role] ?? r}
        </Pill>
      ))}
    </span>
  );
}

export function UsersPage() {
  usePageTitle('Users');
  const { values, page, set } = useUrlFilters(['search', 'status', 'role'] as const);
  const users = useList(['users', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/users', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            search: opt(values.search),
            status: opt(values.status) as (typeof STATUSES)[number] | undefined,
            role: opt(values.role) as (typeof ROLES)[number] | undefined,
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader title="Users" subtitle="Bidders and staff accounts." />
      <FilterBar>
        <SearchFilter
          label="Search"
          value={values.search}
          onChange={(search) => set({ search })}
          placeholder="Phone, name or email"
        />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={STATUSES}
        />
        <SelectFilter label="Role" value={values.role} onChange={(role) => set({ role })} options={ROLES} />
      </FilterBar>
      <Loaded query={users} label="Loading users">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(u) => u.id}
              link={(u) => `/users/${u.id}`}
              dim={users.isPlaceholderData}
              empty="No users match."
              columns={[
                { header: 'Phone', cell: (u) => u.phoneNumber, className: 'whitespace-nowrap' },
                { header: 'Name', cell: (u) => u.fullName ?? '—' },
                { header: 'Status', cell: (u) => <StatusPill status={u.status} /> },
                { header: 'Roles', cell: (u) => <RolePills roles={u.roles} /> },
                {
                  header: 'Last sign-in',
                  cell: (u) => when(u.lastLoginAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
                {
                  header: 'Joined',
                  cell: (u) => when(u.createdAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
              ]}
            />
            <Pagination
              page={page}
              pages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              onChange={(p) => set({ page: String(p) })}
            />
          </>
        )}
      </Loaded>
    </>
  );
}
