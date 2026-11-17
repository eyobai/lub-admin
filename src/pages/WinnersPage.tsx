import { VERIFICATION, DELIVERY } from '../admin/constants';
import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { money, when } from '../admin/format';
import { FilterBar, Loaded, PageHeader, Pill, SelectFilter, StatusPill, Table } from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

export function WinnersPage() {
  usePageTitle('Winners');
  const { values, page, set } = useUrlFilters([
    'verificationStatus',
    'deliveryStatus',
    'published',
    'userId',
  ] as const);
  const winners = useList(['winners', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/winners', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            verificationStatus: opt(values.verificationStatus) as (typeof VERIFICATION)[number] | undefined,
            deliveryStatus: opt(values.deliveryStatus) as (typeof DELIVERY)[number] | undefined,
            published: values.published === 'true' ? true : values.published === 'false' ? false : undefined,
            userId: opt(values.userId),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader
        title="Winners"
        subtitle="Check each win, publish it, and follow the prize until it is delivered."
      />
      <FilterBar>
        <SelectFilter
          label="Verification"
          value={values.verificationStatus}
          onChange={(v) => set({ verificationStatus: v })}
          options={VERIFICATION}
        />
        <SelectFilter
          label="Delivery"
          value={values.deliveryStatus}
          onChange={(v) => set({ deliveryStatus: v })}
          options={DELIVERY}
        />
        <SelectFilter
          label="Published"
          value={values.published}
          onChange={(v) => set({ published: v })}
          options={['true', 'false']}
        />
        {values.userId && (
          <button
            type="button"
            onClick={() => set({ userId: '' })}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold"
          >
            One user only ×
          </button>
        )}
      </FilterBar>
      <Loaded query={winners} label="Loading winners">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(w) => w.id}
              link={(w) => `/winners/${w.id}`}
              dim={winners.isPlaceholderData}
              empty="No winners match."
              columns={[
                { header: 'Prize', cell: (w) => w.productName },
                { header: 'Winner', cell: (w) => w.fullName ?? w.phoneNumber },
                {
                  header: 'Winning bid',
                  cell: (w) => money(w.amountMinor, w.currency),
                  className: 'tabular-nums whitespace-nowrap',
                },
                { header: 'Verification', cell: (w) => <StatusPill status={w.verificationStatus} /> },
                {
                  header: 'Delivery',
                  cell: (w) => (w.delivery ? <StatusPill status={w.delivery.status} /> : '—'),
                },
                {
                  header: 'Published',
                  cell: (w) =>
                    w.publishedAt ? <Pill tone="green">{when(w.publishedAt)}</Pill> : <Pill>No</Pill>,
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
