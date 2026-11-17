import { PRODUCT_STATUSES } from '../admin/constants';
import { api, PAGE_SIZE, unwrap, useList } from '../admin/api';
import { money, when } from '../admin/format';
import { FilterBar, Loaded, PageHeader, SearchFilter, SelectFilter, StatusPill, Table } from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { ButtonLink, Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

export function ProductsPage() {
  usePageTitle('Products');
  const { user } = useAuth();
  const { values, page, set } = useUrlFilters(['status', 'search'] as const);
  const products = useList(['products', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/products', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            status: opt(values.status) as (typeof PRODUCT_STATUSES)[number] | undefined,
            search: opt(values.search),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="The prizes auctions are run for."
        actions={
          can(user?.roles, ...NEEDS.manageCatalog) && <ButtonLink to="/products/new">New product</ButtonLink>
        }
      />
      <FilterBar>
        <SearchFilter
          label="Search"
          value={values.search}
          onChange={(search) => set({ search })}
          placeholder="Name, brand or model"
        />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={PRODUCT_STATUSES}
        />
      </FilterBar>
      <Loaded query={products} label="Loading products">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(p) => p.id}
              link={(p) => `/products/${p.id}`}
              dim={products.isPlaceholderData}
              empty="No products match."
              columns={[
                {
                  header: 'Product',
                  cell: (p) => (
                    <span className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img
                          src={p.images[0].url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 object-cover"
                        />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                      )}
                      {p.name}
                    </span>
                  ),
                },
                {
                  header: 'Brand / model',
                  cell: (p) => [p.brand, p.model].filter(Boolean).join(' · ') || '—',
                },
                {
                  header: 'Worth',
                  cell: (p) => money(p.marketValueMinor, p.currency),
                  className: 'tabular-nums whitespace-nowrap',
                },
                { header: 'Status', cell: (p) => <StatusPill status={p.status} /> },
                {
                  header: 'Updated',
                  cell: (p) => when(p.updatedAt),
                  className: 'whitespace-nowrap text-slate-500',
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
