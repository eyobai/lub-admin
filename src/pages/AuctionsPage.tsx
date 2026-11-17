import { AUCTION_STATUSES } from '../admin/constants';
import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { money, when } from '../admin/format';
import { FilterBar, Loaded, PageHeader, SearchFilter, SelectFilter, StatusPill, Table } from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { ButtonLink, Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

type Status = (typeof AUCTION_STATUSES)[number];

export function AuctionsPage() {
  usePageTitle('Auctions');
  const { user } = useAuth();
  const { values, page, set } = useUrlFilters(['status', 'search', 'productId'] as const);
  const auctions = useList(['auctions', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/auctions', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            status: opt(values.status) as Status | undefined,
            search: opt(values.search),
            productId: opt(values.productId),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader
        title="Auctions"
        subtitle="Every auction, in any status."
        actions={
          can(user?.roles, ...NEEDS.manageCatalog) && <ButtonLink to="/auctions/new">New auction</ButtonLink>
        }
      />
      <FilterBar>
        <SearchFilter
          label="Search"
          value={values.search}
          onChange={(search) => set({ search })}
          placeholder="Title"
        />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={AUCTION_STATUSES}
        />
        {values.productId && (
          <button
            type="button"
            onClick={() => set({ productId: '' })}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold"
          >
            One product only ×
          </button>
        )}
      </FilterBar>
      <Loaded query={auctions} label="Loading auctions">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(a) => a.id}
              link={(a) => `/auctions/${a.id}`}
              dim={auctions.isPlaceholderData}
              empty="No auctions match."
              columns={[
                { header: 'Auction', cell: (a) => a.title },
                { header: 'Status', cell: (a) => <StatusPill status={a.status} /> },
                {
                  header: 'Fee',
                  cell: (a) => money(a.bidFeeMinor, a.currency, a.minorUnits),
                  className: 'tabular-nums whitespace-nowrap',
                },
                {
                  header: 'Bids',
                  cell: (a) => a.totalBidCount.toLocaleString(),
                  className: 'tabular-nums text-right',
                },
                {
                  header: 'Opens',
                  cell: (a) => when(a.opensAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
                {
                  header: 'Closes',
                  cell: (a) => when(a.closesAt),
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
