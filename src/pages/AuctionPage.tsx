import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, PAGE_SIZE, unwrap, useList, useOne, useRefresh, type Schemas } from '../admin/api';
import { humanize, money, when } from '../admin/format';
import { ConfirmAction, Facts, Loaded, PageHeader, Panel, Pill, StatusPill, Table } from '../admin/kit';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Alert, Button, Pagination } from '../components/ui';
import { cx } from '../lib/cx';
import { usePageTitle } from '../lib/usePageTitle';
import { AuctionForm } from './AuctionForm';

type Auction = Schemas['AdminAuctionDto'];

export function NewAuctionPage() {
  usePageTitle('New auction');
  const navigate = useNavigate();
  const refresh = useRefresh();
  return (
    <>
      <PageHeader
        title="New auction"
        subtitle={
          <>
            Saved as a draft: schedule it when it is ready.{' '}
            <Link to="/auctions" className="underline">
              All auctions
            </Link>
          </>
        }
      />
      <AuctionForm
        submitLabel="Create draft"
        onSubmit={async (body) => {
          const created = await unwrap(api.POST('/api/v1/admin/auctions', { body }));
          await refresh();
          navigate(`/auctions/${created.id}`, { replace: true });
        }}
      />
    </>
  );
}

export function AuctionPage() {
  const { id = '' } = useParams();
  const auction = useOne(['auction', id], () =>
    unwrap(api.GET('/api/v1/admin/auctions/{id}', { params: { path: { id } } })),
  );
  usePageTitle(auction.data?.title ?? 'Auction');
  return (
    <Loaded query={auction} label="Loading the auction">
      {(a) => <AuctionDetail auction={a} />}
    </Loaded>
  );
}

function AuctionDetail({ auction: a }: { auction: Auction }) {
  const { user } = useAuth();
  const admin = can(user?.roles, ...NEEDS.manageCatalog);
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const path = { params: { path: { id: a.id } } };
  const m = (minor: string | null | undefined) => money(minor, a.currency, a.minorUnits);
  const editable = admin && (a.status === 'DRAFT' || a.status === 'SCHEDULED');

  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={a.status} />
            <Link to={`/products/${a.product.id}`} className="underline">
              {a.product.name}
            </Link>
            · worth {money(a.product.marketValueMinor, a.product.currency)}
          </span>
        }
        actions={
          admin && (
            <>
              {editable && !editing && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              {a.status === 'DRAFT' && (
                <ConfirmAction
                  label="Schedule"
                  variant="primary"
                  description={`Bidding opens by itself at ${when(a.opensAt)} and closes at ${when(a.closesAt)}.`}
                  run={() => unwrap(api.POST('/api/v1/admin/auctions/{id}/schedule', path))}
                  onDone={() => void refresh()}
                />
              )}
              {a.status === 'SCHEDULED' && (
                <ConfirmAction
                  label="Back to draft"
                  description="It will not open until it is scheduled again."
                  run={() => unwrap(api.POST('/api/v1/admin/auctions/{id}/unschedule', path))}
                  onDone={() => void refresh()}
                />
              )}
              {(a.status === 'DRAFT' || a.status === 'SCHEDULED') && (
                <ConfirmAction
                  label="Open now"
                  variant="dark"
                  description={`Bidding opens straight away and closes at ${when(a.closesAt)}.`}
                  run={() => unwrap(api.POST('/api/v1/admin/auctions/{id}/activate', path))}
                  onDone={() => void refresh()}
                />
              )}
              {a.status === 'CLOSING' && (
                <ConfirmAction
                  label="Work out the result now"
                  variant="dark"
                  description="Bidding has closed. This finds the lowest amount bid exactly once, now instead of waiting for the background job."
                  run={() => unwrap(api.POST('/api/v1/admin/auctions/{id}/finalize', path))}
                  onDone={() => void refresh()}
                />
              )}
              {['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(a.status) && (
                <ConfirmAction
                  label="Cancel auction"
                  danger
                  reason="required"
                  description={
                    a.totalBidCount > 0
                      ? `${a.totalBidCount.toLocaleString()} bids were placed. Every bid fee is refunded to the bidders' wallets.`
                      : 'Nobody has bid yet.'
                  }
                  confirmLabel="Cancel the auction"
                  run={(reason) =>
                    unwrap(api.POST('/api/v1/admin/auctions/{id}/cancel', { ...path, body: { reason } }))
                  }
                  onDone={() => void refresh()}
                />
              )}
            </>
          )
        }
      />

      {a.status === 'CANCELLED' && (
        <div className="mb-5">
          <Alert tone="warning">
            Cancelled {when(a.cancelledAt)}: {a.cancelReason ?? 'no reason given'}.{' '}
            {a.bidFeesRefundedAt
              ? `Bid fees were refunded ${when(a.bidFeesRefundedAt)}.`
              : a.totalBidCount > 0
                ? 'Bid fees are being refunded.'
                : ''}
          </Alert>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <AuctionForm
            auction={a}
            submitLabel="Save changes"
            onSubmit={async (body) => {
              await unwrap(api.PATCH('/api/v1/admin/auctions/{id}', { ...path, body }));
              await refresh();
              setEditing(false);
            }}
          />
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Stop editing
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Rules">
              <Facts
                items={[
                  ['Fee per bid', m(a.bidFeeMinor)],
                  ['Bids placed', a.totalBidCount.toLocaleString()],
                  ['Lowest bid', m(a.minBidMinor)],
                  ['Highest bid', m(a.maxBidMinor)],
                  ['Steps of', m(a.bidStepMinor)],
                  [
                    'Bids per person',
                    a.maxBidsPerUser === null ? 'No limit' : a.maxBidsPerUser.toLocaleString(),
                  ],
                  ['Bids per request', a.maxBidsPerRequest.toLocaleString()],
                  [
                    'Same amount twice',
                    a.duplicateBidPolicy === 'REJECT_SAME_USER_SAME_AMOUNT' ? 'Refused' : 'Allowed',
                  ],
                  ['No unique amount', a.noUniqueBidPolicy ? humanize(a.noUniqueBidPolicy) : '—'],
                  ['Product status', humanize(a.productStatus)],
                ]}
              />
            </Panel>
            <Panel title="Timeline">
              <Facts
                columns={1}
                items={[
                  ['Created', when(a.createdAt)],
                  ['Opens', when(a.opensAt)],
                  ['Opened', when(a.activatedAt)],
                  ['Closes', when(a.closesAt)],
                  ['Closed', when(a.closedAt)],
                  ['Completed', when(a.completedAt)],
                ]}
              />
            </Panel>
          </div>
          {a.status !== 'DRAFT' && <Statistics auction={a} />}
          {a.status === 'COMPLETED' && <Result auction={a} />}
          {a.totalBidCount > 0 && <Bids auction={a} />}
        </div>
      )}
    </>
  );
}

function Statistics({ auction: a }: { auction: Auction }) {
  const stats = useOne(['auction', a.id, 'statistics'], () =>
    unwrap(api.GET('/api/v1/admin/auctions/{id}/statistics', { params: { path: { id: a.id } } })),
  );
  const m = (minor: string | null | undefined) => money(minor, a.currency, a.minorUnits);
  return (
    <Panel title="Bidding so far">
      <Loaded query={stats} label="Loading statistics">
        {(s) => (
          <Facts
            columns={3}
            items={[
              ['Bids', s.bidCount.toLocaleString()],
              ['Bidders', s.bidderCount.toLocaleString()],
              ['Payments', s.submissionCount.toLocaleString()],
              ['Different amounts', s.distinctAmounts.toLocaleString()],
              ['Amounts bid exactly once', s.uniqueAmounts.toLocaleString()],
              ['Fees charged', `${m(s.feesChargedMinor)}${s.feesRefunded ? ' (refunded)' : ''}`],
              ['Lowest bid', m(s.lowestBidMinor)],
              ['Highest bid', m(s.highestBidMinor)],
              ['First / last bid', s.firstBidAt ? `${when(s.firstBidAt)} – ${when(s.lastBidAt)}` : '—'],
            ]}
          />
        )}
      </Loaded>
    </Panel>
  );
}

function Result({ auction: a }: { auction: Auction }) {
  const result = useOne(['auction', a.id, 'result'], () =>
    unwrap(api.GET('/api/v1/admin/auctions/{id}/result', { params: { path: { id: a.id } } })),
  );
  const [audit, setAudit] = useState<Schemas['ResultAuditDto'] | null>(null);
  const [checking, setChecking] = useState(false);
  const m = (minor: string | null | undefined) => money(minor, a.currency, a.minorUnits);
  return (
    <Panel
      title="Result"
      actions={
        <Button
          variant="secondary"
          busy={checking}
          onClick={async () => {
            setChecking(true);
            try {
              setAudit(
                await unwrap(
                  api.GET('/api/v1/admin/auctions/{id}/result/audit', { params: { path: { id: a.id } } }),
                ),
              );
            } finally {
              setChecking(false);
            }
          }}
        >
          Re-check the result
        </Button>
      }
    >
      {audit && (
        <div className="mb-3">
          <Alert tone={audit.matches ? 'success' : 'error'}>
            {audit.matches
              ? `Recomputed from the bids at ${when(audit.checkedAt)}: it matches the recorded result.`
              : 'Recomputed result does NOT match the recorded one. Investigate before publishing a winner.'}
          </Alert>
        </div>
      )}
      <Loaded query={result} label="Loading the result">
        {(r) => (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-ink px-5 py-4 text-white">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-ink">
                {r.winningAmount ?? '—'}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-brand-400 uppercase">
                  {humanize(r.outcome)}
                </p>
                <p className="text-2xl font-bold">
                  {r.winningAmountMinor ? m(r.winningAmountMinor) : 'No winning amount'}
                </p>
                {r.winner && (
                  <p className="text-sm text-white/70">
                    <Link to={`/winners/${r.winner.id}`} className="underline">
                      {r.winner.phoneNumber}
                    </Link>{' '}
                    · <StatusPill status={r.winner.verificationStatus} />
                  </p>
                )}
              </div>
            </div>
            <Facts
              columns={3}
              items={[
                ['Bids', r.totalBids.toLocaleString()],
                ['Different amounts', r.distinctAmounts.toLocaleString()],
                ['Bid exactly once', r.uniqueAmounts.toLocaleString()],
                ['Computed', when(r.computedAt)],
                ['Algorithm', r.algorithmVersion],
                [
                  'Input fingerprint',
                  <code key="h" className="text-xs break-all">
                    {r.inputHash}
                  </code>,
                ],
              ]}
            />
            {r.histogram.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  Lowest amounts and how often each was bid
                </h3>
                <ul className="space-y-1">
                  {r.histogram.slice(0, 30).map((h) => {
                    const top = Math.max(...r.histogram.slice(0, 30).map((x) => x.count));
                    return (
                      <li
                        key={h.amountMinor}
                        className="relative overflow-hidden rounded-full bg-slate-100 px-4 py-1.5 text-sm"
                      >
                        <span
                          aria-hidden="true"
                          className={cx(
                            'absolute inset-y-0 left-0',
                            h.amountMinor === r.winningAmountMinor ? 'bg-brand-400/60' : 'bg-slate-300/60',
                          )}
                          style={{ width: `${(h.count / top) * 100}%` }}
                        />
                        <span className="relative flex justify-between font-semibold tabular-nums">
                          <span>
                            {m(h.amountMinor)}{' '}
                            {h.amountMinor === r.winningAmountMinor && <Pill tone="gold">Winner</Pill>}
                          </span>
                          <span>
                            {h.count} {h.count === 1 ? 'bid' : 'bids'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Loaded>
    </Panel>
  );
}

function Bids({ auction: a }: { auction: Auction }) {
  const [page, setPage] = useState(1);
  const bids = useList(['auction', a.id, 'bids', page], () =>
    unwrap(
      api.GET('/api/v1/admin/auctions/{id}/bids', {
        params: { path: { id: a.id }, query: { page, limit: PAGE_SIZE } },
      }),
    ),
  );
  return (
    <Panel title="Bids, in the order they were accepted">
      <Loaded query={bids} label="Loading bids">
        {(data) => (
          <>
            <Table
              rows={data.items}
              rowKey={(b) => b.id}
              dim={bids.isPlaceholderData}
              columns={[
                { header: '#', cell: (b) => b.sequence, className: 'tabular-nums text-slate-500' },
                {
                  header: 'Amount',
                  cell: (b) => money(b.amountMinor, a.currency, a.minorUnits),
                  className: 'tabular-nums font-semibold',
                },
                {
                  header: 'Bidder',
                  cell: (b) => (
                    <Link to={`/users/${b.userId}`} className="underline">
                      {b.phoneNumber}
                    </Link>
                  ),
                },
                {
                  header: 'Placed',
                  cell: (b) => when(b.createdAt),
                  className: 'whitespace-nowrap text-slate-600',
                },
              ]}
            />
            <Pagination
              page={page}
              pages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              onChange={setPage}
            />
          </>
        )}
      </Loaded>
    </Panel>
  );
}
