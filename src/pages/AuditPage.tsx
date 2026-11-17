import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { humanize, when } from '../admin/format';
import { FilterBar, Loaded, PageHeader, Pill, SearchFilter, SelectFilter, Table } from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

const ENTITY_LINKS: Record<string, string> = {
  auction: '/auctions/',
  product: '/products/',
  user: '/users/',
  winner: '/winners/',
  payment_transaction: '/deposits/',
};

function Json({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <pre className="mt-1 max-h-60 overflow-auto rounded-2xl bg-slate-100 p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/** Who did what, when: every change staff and the system made. */
export function AuditPage() {
  usePageTitle('Audit log');
  const { values, page, set } = useUrlFilters(['action', 'entityType', 'entityId', 'actorId'] as const);
  const [open, setOpen] = useState<string | null>(null);
  const logs = useList(['audit', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/audit-logs', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            action: opt(values.action),
            entityType: opt(values.entityType),
            entityId: opt(values.entityId),
            actorId: opt(values.actorId),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change made by staff and by the system, newest first." />
      <FilterBar>
        <SearchFilter
          label="Action"
          value={values.action}
          onChange={(action) => set({ action })}
          placeholder="e.g. auction.cancel"
        />
        <SelectFilter
          label="About"
          value={values.entityType}
          onChange={(entityType) => set({ entityType })}
          options={Object.keys(ENTITY_LINKS).concat('wallet')}
        />
        <SearchFilter label="Record id" value={values.entityId} onChange={(entityId) => set({ entityId })} />
      </FilterBar>
      <Loaded query={logs} label="Loading the audit log">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(l) => l.id}
              dim={logs.isPlaceholderData}
              empty="Nothing recorded matches."
              columns={[
                {
                  header: 'When',
                  cell: (l) => when(l.createdAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
                {
                  header: 'Who',
                  cell: (l) =>
                    l.actor ? (
                      <Link to={`/users/${l.actor.id}`} className="underline">
                        {l.actor.fullName ?? l.actor.phoneNumber}
                      </Link>
                    ) : (
                      <Pill>{humanize(l.actorType)}</Pill>
                    ),
                },
                { header: 'Action', cell: (l) => <code className="text-xs font-semibold">{l.action}</code> },
                {
                  header: 'About',
                  cell: (l) =>
                    l.entityId && ENTITY_LINKS[l.entityType] ? (
                      <Link to={`${ENTITY_LINKS[l.entityType]}${l.entityId}`} className="underline">
                        {humanize(l.entityType)}
                      </Link>
                    ) : (
                      humanize(l.entityType)
                    ),
                },
                {
                  header: 'Details',
                  cell: (l) => (
                    <div className="max-w-md">
                      <button
                        type="button"
                        aria-expanded={open === l.id}
                        onClick={() => setOpen(open === l.id ? null : l.id)}
                        className="text-sm font-semibold text-brand-700 underline"
                      >
                        {open === l.id ? 'Hide' : 'Show'}
                      </button>
                      {open === l.id && (
                        <div className="mt-2 space-y-2">
                          <Json label="Before" value={l.before} />
                          <Json label="After" value={l.after} />
                          <Json label="More" value={l.metadata} />
                          <p className="text-xs text-slate-500">
                            {l.ipAddress ?? 'no address'} · {l.requestId ?? 'no request id'}
                          </p>
                        </div>
                      )}
                    </div>
                  ),
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
