import { Link } from 'react-router-dom';
import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { humanize, when } from '../admin/format';
import {
  FilterBar,
  Loaded,
  PageHeader,
  Pill,
  SearchFilter,
  SelectFilter,
  Table,
  type Tone,
} from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

const TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ACCOUNT_LOCKED',
  'REFRESH_TOKEN_REUSE',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'OTP_VERIFICATION_FAILED',
  'SUSPICIOUS_BIDDING',
  'SUSPICIOUS_PAYMENT',
] as const;

const TONE: Partial<Record<(typeof TYPES)[number], Tone>> = {
  LOGIN_SUCCESS: 'green',
  LOGIN_FAILED: 'amber',
  ACCOUNT_LOCKED: 'red',
  REFRESH_TOKEN_REUSE: 'red',
  SUSPICIOUS_BIDDING: 'red',
  SUSPICIOUS_PAYMENT: 'red',
};

export function SecurityPage() {
  usePageTitle('Security events');
  const { values, page, set } = useUrlFilters(['type', 'phoneNumber', 'userId'] as const);
  const events = useList(['security', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/security-events', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            type: opt(values.type) as (typeof TYPES)[number] | undefined,
            phoneNumber: opt(values.phoneNumber),
            userId: opt(values.userId),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader
        title="Security events"
        subtitle="Sign-ins, lockouts and anything that looked suspicious."
      />
      <FilterBar>
        <SelectFilter label="Kind" value={values.type} onChange={(type) => set({ type })} options={TYPES} />
        <SearchFilter
          label="Phone number"
          value={values.phoneNumber}
          onChange={(phoneNumber) => set({ phoneNumber })}
          placeholder="+2519…"
        />
      </FilterBar>
      <Loaded query={events} label="Loading security events">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(e) => e.id}
              dim={events.isPlaceholderData}
              empty="Nothing recorded matches."
              columns={[
                {
                  header: 'When',
                  cell: (e) => when(e.createdAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
                {
                  header: 'Kind',
                  cell: (e) => <Pill tone={TONE[e.type] ?? 'neutral'}>{humanize(e.type)}</Pill>,
                },
                {
                  header: 'Account',
                  cell: (e) =>
                    e.userId ? (
                      <Link to={`/users/${e.userId}`} className="underline">
                        {e.phoneNumber ?? 'Open account'}
                      </Link>
                    ) : (
                      (e.phoneNumber ?? '—')
                    ),
                },
                {
                  header: 'From',
                  cell: (e) => (
                    <span className="text-xs">
                      {e.ipAddress ?? '—'}
                      <span className="block max-w-xs truncate text-slate-500">{e.userAgent}</span>
                    </span>
                  ),
                },
                {
                  header: 'Details',
                  cell: (e) =>
                    e.metadata && Object.keys(e.metadata).length > 0 ? (
                      <code className="block max-w-sm text-xs break-all text-slate-600">
                        {JSON.stringify(e.metadata)}
                      </code>
                    ) : (
                      '—'
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
