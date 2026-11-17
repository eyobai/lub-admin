import { Link } from 'react-router-dom';
import { api, unwrap, useOne } from '../admin/api';
import { when } from '../admin/format';
import { Loaded, PageHeader, Panel } from '../admin/kit';
import { cx } from '../lib/cx';
import { usePageTitle } from '../lib/usePageTitle';

function Stat({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: number | string;
  to?: string;
  tone?: 'gold' | 'red' | 'amber';
}) {
  const body = (
    <>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p
        className={cx(
          'mt-1 text-2xl font-bold tabular-nums',
          tone === 'red'
            ? 'text-red-700'
            : tone === 'amber'
              ? 'text-amber-700'
              : tone === 'gold'
                ? 'text-brand-700'
                : 'text-ink',
        )}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </>
  );
  const look = 'block rounded-2xl bg-slate-100 px-4 py-3';
  return to ? (
    <Link to={to} className={cx(look, 'hover:bg-slate-200')}>
      {body}
    </Link>
  ) : (
    <div className={look}>{body}</div>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const dashboard = useOne(['dashboard'], () => unwrap(api.GET('/api/v1/admin/dashboard')));
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={dashboard.data ? `Figures as of ${when(dashboard.data.generatedAt)}` : undefined}
      />
      <Loaded query={dashboard} label="Loading the dashboard">
        {(d) => (
          <div className="space-y-5">
            {d.money.map((m) => (
              <section
                key={m.currency}
                aria-label={`Money in ${m.currency}`}
                className="relative overflow-hidden rounded-4xl bg-ink px-6 py-6 text-white"
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-500/25 blur-2xl"
                />
                <p className="relative text-sm text-white/70">Bid fee revenue ({m.currency})</p>
                <p className="relative text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                  {m.currency} {m.revenue}
                </p>
                <dl className="relative mt-4 grid gap-3 text-sm sm:grid-cols-5">
                  {(
                    [
                      ['Last 24 hours', m.revenueLast24h],
                      ['Last 7 days', m.revenueLast7d],
                      ['Last 30 days', m.revenueLast30d],
                      ['In bidders’ wallets', m.walletBalances],
                      ['Held for withdrawals', m.heldBalances],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-white/60">{label}</dt>
                      <dd className="font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Needs attention">
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label="Winners to verify"
                    value={d.winners.pendingVerification}
                    to="/winners?verificationStatus=PENDING_VERIFICATION"
                    tone={d.winners.pendingVerification ? 'amber' : undefined}
                  />
                  <Stat
                    label="Disputed deliveries"
                    value={d.deliveries.disputed}
                    to="/winners?deliveryStatus=DISPUTED"
                    tone={d.deliveries.disputed ? 'red' : undefined}
                  />
                  <Stat label="Auctions closing" value={d.auctions.closing} to="/auctions?status=CLOSING" />
                  <Stat
                    label="Frozen wallets"
                    value={d.frozenWallets}
                    tone={d.frozenWallets ? 'amber' : undefined}
                  />
                </div>
              </Panel>
              <Panel title="Auctions">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Live" value={d.auctions.active} to="/auctions?status=ACTIVE" tone="gold" />
                  <Stat label="Scheduled" value={d.auctions.scheduled} to="/auctions?status=SCHEDULED" />
                  <Stat label="Drafts" value={d.auctions.draft} to="/auctions?status=DRAFT" />
                  <Stat label="Completed" value={d.auctions.completed} to="/auctions?status=COMPLETED" />
                  <Stat label="Cancelled" value={d.auctions.cancelled} to="/auctions?status=CANCELLED" />
                  <Stat label="Closing" value={d.auctions.closing} to="/auctions?status=CLOSING" />
                </div>
              </Panel>
              <Panel title="Bids">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="All time" value={d.bids.total} />
                  <Stat label="Last 24 hours" value={d.bids.last24h} />
                  <Stat label="Last 7 days" value={d.bids.last7d} />
                  <Stat label="Last 30 days" value={d.bids.last30d} />
                </div>
              </Panel>
              <Panel title="Users">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Accounts" value={d.users.total} to="/users" />
                  <Stat label="New in 7 days" value={d.users.newLast7d} />
                  <Stat label="Suspended" value={d.users.suspended} to="/users?status=SUSPENDED" />
                  <Stat label="Blocked" value={d.users.blocked} to="/users?status=BLOCKED" />
                </div>
              </Panel>
              <Panel title="Winners">
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label="Verified"
                    value={d.winners.verified}
                    to="/winners?verificationStatus=VERIFIED"
                  />
                  <Stat label="Published" value={d.winners.published} to="/winners?published=true" />
                  <Stat
                    label="Rejected"
                    value={d.winners.rejected}
                    to="/winners?verificationStatus=REJECTED"
                  />
                  <Stat
                    label="To verify"
                    value={d.winners.pendingVerification}
                    to="/winners?verificationStatus=PENDING_VERIFICATION"
                  />
                </div>
              </Panel>
              <Panel title="Deliveries">
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'contacted', 'verified', 'dispatched', 'delivered', 'disputed'] as const).map(
                    (k) => (
                      <Stat
                        key={k}
                        label={k}
                        value={d.deliveries[k]}
                        to={`/winners?deliveryStatus=${k.toUpperCase()}`}
                      />
                    ),
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </Loaded>
    </>
  );
}
