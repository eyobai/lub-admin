import { api, unwrap, useOne } from '../admin/api';
import { humanize, money, when } from '../admin/format';
import { Facts, Loaded, PageHeader, Panel, Table } from '../admin/kit';
import { Alert, Button } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

/** Proves the cached balances from the ledger lines. Read-only, so it is safe to run at any time. */
export function LedgerPage() {
  usePageTitle('Ledger check');
  const report = useOne(['reconciliation'], () => unwrap(api.GET('/api/v1/admin/ledger/reconciliation')));
  return (
    <>
      <PageHeader
        title="Ledger check"
        subtitle="Every balance is recomputed from the ledger lines and compared with what is stored."
        actions={
          <Button variant="secondary" onClick={() => void report.refetch()} busy={report.isFetching}>
            Run again
          </Button>
        }
      />
      <Loaded query={report} label="Checking the ledger">
        {(r) => (
          <div className="space-y-5">
            <Alert tone={r.ok ? 'success' : 'error'}>
              {r.ok
                ? `All good: the books balance (checked ${when(r.checkedAt)}).`
                : `${r.issues.length} problem${r.issues.length === 1 ? '' : 's'} found (checked ${when(r.checkedAt)}). Tell the engineers before moving more money by hand.`}
            </Alert>
            <Facts
              columns={3}
              items={[
                ['Accounts', r.accounts.toLocaleString()],
                ['Transactions', r.transactions.toLocaleString()],
                ['Ledger lines', r.entries.toLocaleString()],
              ]}
            />
            {r.issues.length > 0 && (
              <Panel title="Problems">
                <Table
                  rows={r.issues}
                  rowKey={(i) => `${i.kind}-${i.subject}`}
                  columns={[
                    { header: 'Kind', cell: (i) => humanize(i.kind) },
                    { header: 'Where', cell: (i) => <code className="text-xs">{i.subject}</code> },
                    { header: 'Detail', cell: (i) => i.detail },
                  ]}
                />
              </Panel>
            )}
            <Panel title="Totals by kind of account">
              <Table
                rows={r.totals}
                rowKey={(t) => `${t.currency}-${t.accountType}`}
                columns={[
                  { header: 'Account kind', cell: (t) => humanize(t.accountType) },
                  { header: 'Accounts', cell: (t) => t.accounts.toLocaleString(), className: 'tabular-nums' },
                  {
                    header: 'Balance',
                    cell: (t) => money(t.balanceMinor, t.currency),
                    className: 'tabular-nums whitespace-nowrap font-semibold',
                  },
                ]}
              />
            </Panel>
          </div>
        )}
      </Loaded>
    </>
  );
}
