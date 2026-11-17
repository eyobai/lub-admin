import { useParams, Link } from 'react-router-dom';
import { api, PAGE_SIZE, unwrap, useList, useOne, useRefresh, type Schemas } from '../admin/api';
import { humanize, money, when } from '../admin/format';
import {
  ConfirmAction,
  Facts,
  FilterBar,
  Loaded,
  PageHeader,
  Panel,
  Pill,
  SearchFilter,
  SelectFilter,
  StatusPill,
  Table,
} from '../admin/kit';
import { opt, useUrlFilters } from '../admin/filters';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Alert, Pagination } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

const STATUSES = ['INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

const how = (d: Schemas['AdminDepositDto']) =>
  d.bid ? 'Pay and bid' : d.chargeMethod ? `Top-up · ${d.chargeMethod}` : 'Top-up · checkout page';

export function DepositsPage() {
  usePageTitle('Deposits');
  const { values, page, set } = useUrlFilters(['status', 'reference', 'needsReview', 'userId'] as const);
  const deposits = useList(['deposits', values, page], () =>
    unwrap(
      api.GET('/api/v1/admin/deposits', {
        params: {
          query: {
            page,
            limit: PAGE_SIZE,
            status: opt(values.status) as (typeof STATUSES)[number] | undefined,
            reference: opt(values.reference),
            needsReview: values.needsReview === 'true' ? true : undefined,
            userId: opt(values.userId),
          },
        },
      }),
    ),
  );
  return (
    <>
      <PageHeader title="Deposits" subtitle="Money paid in through Chapa: top-ups and payments for bids." />
      <FilterBar>
        <SearchFilter
          label="Reference"
          value={values.reference}
          onChange={(reference) => set({ reference })}
          placeholder="LUB-… or Chapa's reference"
        />
        <SelectFilter
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={STATUSES}
        />
        <label className="flex items-center gap-2 self-end rounded-full bg-white px-4 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={values.needsReview === 'true'}
            onChange={(e) => set({ needsReview: e.target.checked ? 'true' : '' })}
            className="h-4 w-4 accent-[#161513]"
          />
          Needs review only
        </label>
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
      <Loaded query={deposits} label="Loading deposits">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(d) => d.id}
              link={(d) => `/deposits/${d.id}`}
              dim={deposits.isPlaceholderData}
              empty="No deposits match."
              columns={[
                { header: 'Reference', cell: (d) => d.reference, className: 'whitespace-nowrap' },
                { header: 'Payer', cell: (d) => d.phoneNumber, className: 'whitespace-nowrap' },
                {
                  header: 'Amount',
                  cell: (d) => money(d.amountMinor, d.currency, d.minorUnits),
                  className: 'tabular-nums whitespace-nowrap',
                },
                { header: 'Kind', cell: how },
                {
                  header: 'Status',
                  cell: (d) => (
                    <span className="flex flex-wrap gap-1">
                      <StatusPill status={d.status} />
                      {d.reviewReason && <Pill tone="red">Review</Pill>}
                    </span>
                  ),
                },
                {
                  header: 'Started',
                  cell: (d) => when(d.createdAt),
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

export function DepositPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const finance = can(user?.roles, ...NEEDS.money);
  const refresh = useRefresh();
  const deposit = useOne(['deposit', id], () =>
    unwrap(api.GET('/api/v1/admin/deposits/{id}', { params: { path: { id } } })),
  );
  usePageTitle(deposit.data?.reference ?? 'Deposit');
  const path = { params: { path: { id } } };
  return (
    <Loaded query={deposit} label="Loading the deposit">
      {(d) => (
        <>
          <PageHeader
            title={d.reference}
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill status={d.status} /> {how(d)} ·{' '}
                <Link to={`/users/${d.userId}`} className="underline">
                  {d.phoneNumber}
                </Link>
              </span>
            }
            actions={
              finance && (
                <>
                  <ConfirmAction
                    label="Ask Chapa again"
                    description="Checks this payment with Chapa now. Money is only added if Chapa confirms every detail."
                    run={() => unwrap(api.POST('/api/v1/admin/deposits/{id}/recheck', path))}
                    onDone={() => void refresh()}
                  />
                  {d.reviewReason && (
                    <ConfirmAction
                      label="Mark reviewed"
                      variant="primary"
                      reason="required"
                      reasonLabel="What was found and done"
                      description="Any correction to the wallet is a separate adjustment on the user's page."
                      run={(note) =>
                        unwrap(
                          api.POST('/api/v1/admin/deposits/{id}/resolve-review', { ...path, body: { note } }),
                        )
                      }
                      onDone={() => void refresh()}
                    />
                  )}
                </>
              )
            }
          />
          {d.reviewReason && (
            <div className="mb-5">
              <Alert>Needs a person to look at it: {d.reviewReason}</Alert>
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Payment">
              <Facts
                items={[
                  ['Amount', money(d.amountMinor, d.currency, d.minorUnits)],
                  ['Bonus', BigInt(d.bonusMinor) > 0n ? money(d.bonusMinor, d.currency, d.minorUnits) : '—'],
                  ['Provider', d.provider],
                  ['Chapa reference', d.providerReference ?? '—'],
                  ['Paid with', d.chargeMethod ?? 'Chapa checkout page'],
                  ['Failure', d.failureReason ?? '—'],
                ]}
              />
            </Panel>
            <Panel title="Timeline">
              <Facts
                items={[
                  ['Started', when(d.createdAt)],
                  ['Confirmed', when(d.confirmedAt)],
                  ['Last asked Chapa', when(d.lastCheckedAt)],
                  ['Expires', when(d.expiresAt)],
                  ['Wallet transaction', d.walletTransactionId ?? '—'],
                  ['Updated', when(d.updatedAt)],
                ]}
              />
            </Panel>
            {d.bid && (
              <Panel title="Bids it pays for" className="lg:col-span-2">
                <Facts
                  columns={3}
                  items={[
                    [
                      'Auction',
                      <Link key="a" to={`/auctions/${d.bid.auctionId}`} className="underline">
                        Open auction
                      </Link>,
                    ],
                    ['Amounts', d.bid.amountsMinor.map((a) => money(a, d.currency, d.minorUnits)).join(', ')],
                    ['State', `${humanize(d.bid.state)}${d.bid.error ? `: ${d.bid.error}` : ''}`],
                  ]}
                />
              </Panel>
            )}
          </div>
        </>
      )}
    </Loaded>
  );
}
