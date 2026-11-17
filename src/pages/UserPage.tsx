import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { errorMessage } from '../api/errors';
import { ADMIN, api, unwrap, useOne, useRefresh, type Schemas } from '../admin/api';
import { MoneyField, SelectField, TextArea } from '../admin/fields';
import { humanize, money, moneyToMinor, when } from '../admin/format';
import { ConfirmAction, Facts, Loaded, PageHeader, Panel, Pill, StatusPill, Table } from '../admin/kit';
import { can, NEEDS, ROLE_LABELS, STAFF_ROLES } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Alert, Button } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { usePageTitle } from '../lib/usePageTitle';
import { RolePills } from './UsersPage';

type UserDetail = Schemas['AdminUserDetailDto'];

export function UserPage() {
  const { id = '' } = useParams();
  const user = useOne(['user', id], () =>
    unwrap(api.GET('/api/v1/admin/users/{id}', { params: { path: { id } } })),
  );
  usePageTitle(user.data ? (user.data.fullName ?? user.data.phoneNumber) : 'User');
  return (
    <Loaded query={user} label="Loading the user">
      {(u) => <UserDetailView user={u} />}
    </Loaded>
  );
}

function UserDetailView({ user: u }: { user: UserDetail }) {
  const { user: me } = useAuth();
  const refresh = useRefresh();
  const self = me?.id === u.id;
  const path = { params: { path: { id: u.id } } };
  const done = () => void refresh();
  const [temporary, setTemporary] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title={u.fullName ?? u.phoneNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={u.status} /> <RolePills roles={u.roles} /> {u.phoneNumber}
          </span>
        }
        actions={
          !self && (
            <>
              {can(me?.roles, ...NEEDS.accountStatus) && u.status === 'ACTIVE' && (
                <>
                  <ConfirmAction
                    label="Suspend"
                    reason="required"
                    description="They are signed out and cannot sign in until reactivated. Their wallet and bids stay as they are."
                    run={(reason) =>
                      unwrap(api.POST('/api/v1/admin/users/{id}/suspend', { ...path, body: { reason } }))
                    }
                    onDone={done}
                  />
                  <ConfirmAction
                    label="Block"
                    danger
                    reason="required"
                    description="For fraud or abuse. They are signed out and cannot sign in until reactivated."
                    run={(reason) =>
                      unwrap(api.POST('/api/v1/admin/users/{id}/block', { ...path, body: { reason } }))
                    }
                    onDone={done}
                  />
                </>
              )}
              {can(me?.roles, ...NEEDS.accountStatus) && u.status !== 'ACTIVE' && (
                <ConfirmAction
                  label="Reactivate"
                  variant="primary"
                  reason="required"
                  run={(reason) =>
                    unwrap(api.POST('/api/v1/admin/users/{id}/reactivate', { ...path, body: { reason } }))
                  }
                  onDone={done}
                />
              )}
              {can(me?.roles, ...NEEDS.accountHelp) && (
                <>
                  <ConfirmAction
                    label="Reset password"
                    reason="required"
                    description="A temporary password is made and shown once. They must choose a new one when they sign in."
                    run={(reason) =>
                      unwrap(
                        api.POST('/api/v1/admin/users/{id}/reset-password', { ...path, body: { reason } }),
                      )
                    }
                    onDone={(result) => {
                      setTemporary((result as Schemas['PasswordResetResultDto']).temporaryPassword);
                      done();
                    }}
                  />
                  <ConfirmAction
                    label="Sign out everywhere"
                    reason="required"
                    description={`Ends all ${u.activeSessions} active sessions of this account.`}
                    run={(reason) =>
                      unwrap(
                        api.POST('/api/v1/admin/users/{id}/revoke-sessions', { ...path, body: { reason } }),
                      )
                    }
                    onDone={done}
                  />
                </>
              )}
            </>
          )
        }
      />

      {temporary && (
        <div className="mb-5">
          <Alert tone="warning">
            Temporary password, shown only now:{' '}
            <code className="rounded bg-white px-2 py-0.5 text-base font-bold">{temporary}</code>. Give it to
            them in person or by phone, never by SMS to an unconfirmed number.
          </Alert>
        </div>
      )}
      {self && (
        <div className="mb-5">
          <Alert tone="info">This is your own account: changes to it are made by another admin.</Alert>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Account">
            <Facts
              items={[
                ['Phone', `${u.phoneNumber}${u.phoneVerified ? ' (verified)' : ''}`],
                ['Email', u.email ?? '—'],
                ['Status note', u.statusReason ?? '—'],
                ['Joined', when(u.createdAt)],
                ['Last sign-in', when(u.lastLoginAt)],
                ['Password changed', when(u.passwordChangedAt)],
                ['Active sessions', u.activeSessions.toLocaleString()],
                ['Must change password', u.mustChangePassword ? 'Yes' : 'No'],
              ]}
            />
            <p className="mt-3 text-sm text-slate-600">
              {u.bidCount.toLocaleString()} bids · {u.winCount.toLocaleString()} wins ·{' '}
              <Link to={`/winners?userId=${u.id}`} className="underline">
                Their wins
              </Link>{' '}
              ·{' '}
              <Link to={`/deposits?userId=${u.id}`} className="underline">
                Their deposits
              </Link>
            </p>
          </Panel>
          <Roles user={u} self={self} />
        </div>
        <WalletPanel userId={u.id} />
      </div>
    </>
  );
}

function Roles({ user: u, self }: { user: UserDetail; self: boolean }) {
  const { user: me } = useAuth();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>(u.roles.filter((r) => r !== 'USER'));
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = can(me?.roles, ...NEEDS.roles) && !self;

  async function save() {
    if (reason.trim().length < 5) {
      setFailure('Write at least 5 characters.');
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await unwrap(
        api.PUT('/api/v1/admin/users/{id}/roles', {
          params: { path: { id: u.id } },
          body: { reason: reason.trim(), roles: chosen as Schemas['SetRolesDto']['roles'] },
        }),
      );
      await refresh();
      setOpen(false);
      setReason('');
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Back-office roles"
      actions={
        allowed && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Change roles
          </Button>
        )
      }
    >
      <RolePills roles={u.roles} />
      <ul className="mt-3 space-y-1 text-sm text-slate-600">
        <li>
          <strong>Support</strong>: looks things up, resets passwords, follows deliveries.
        </li>
        <li>
          <strong>Finance</strong>: deposits, wallet corrections, the ledger check.
        </li>
        <li>
          <strong>Admin</strong>: products, auctions, winners, account status, audit log.
        </li>
        <li>
          <strong>Super admin</strong>: everything, and gives out these roles.
        </li>
      </ul>
      {open && (
        <Sheet
          title="Back-office roles"
          onClose={() => !busy && setOpen(false)}
          footer={
            <Button className="w-full" busy={busy} onClick={() => void save()}>
              Save roles
            </Button>
          }
        >
          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-600">
              Every account can bid. Staff roles add access to this back office.
            </legend>
            {STAFF_ROLES.map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 font-semibold"
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(role)}
                  onChange={(e) =>
                    setChosen(e.target.checked ? [...chosen, role] : chosen.filter((r) => r !== role))
                  }
                  className="h-4 w-4 accent-[#161513]"
                />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </fieldset>
          <TextArea
            label="Reason (kept in the audit log)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          {failure && <Alert>{failure}</Alert>}
        </Sheet>
      )}
    </Panel>
  );
}

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit',
  BID_FEE: 'Bid fees',
  REFUND: 'Refund',
  WITHDRAWAL_HOLD: 'Withdrawal requested',
  WITHDRAWAL_RELEASE: 'Withdrawal cancelled',
  WITHDRAWAL_PAYOUT: 'Withdrawal paid',
  ADJUSTMENT: 'Adjustment',
  BONUS: 'Top-up bonus',
  BONUS_EXPIRY: 'Bonus expired',
};

function WalletPanel({ userId }: { userId: string }) {
  const { user: me } = useAuth();
  const finance = can(me?.roles, ...NEEDS.money) && me?.id !== userId;
  const refresh = useRefresh();
  const wallet = useOne(['wallet', userId], () =>
    unwrap(api.GET('/api/v1/admin/wallets/{userId}', { params: { path: { userId } } })),
  );
  const history = useInfiniteQuery({
    queryKey: [ADMIN, 'wallet', userId, 'transactions'],
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/api/v1/admin/wallets/{userId}/transactions', {
          params: { path: { userId }, query: { limit: 20, cursor: pageParam } },
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = history.data?.pages.flatMap((p) => p.items) ?? [];
  const path = { params: { path: { userId } } };

  return (
    <Panel
      title="Wallet"
      actions={
        finance &&
        wallet.data && (
          <>
            <Adjust userId={userId} currency={wallet.data.currency} />
            {wallet.data.isFrozen ? (
              <ConfirmAction
                label="Unfreeze"
                reason="required"
                run={(reason) =>
                  unwrap(api.POST('/api/v1/admin/wallets/{userId}/unfreeze', { ...path, body: { reason } }))
                }
                onDone={() => void refresh()}
              />
            ) : (
              <ConfirmAction
                label="Freeze"
                danger
                reason="required"
                description="They can still receive money but cannot bid or withdraw until unfrozen."
                run={(reason) =>
                  unwrap(api.POST('/api/v1/admin/wallets/{userId}/freeze', { ...path, body: { reason } }))
                }
                onDone={() => void refresh()}
              />
            )}
          </>
        )
      }
    >
      <Loaded query={wallet} label="Loading the wallet">
        {(w) => (
          <div className="space-y-4">
            {w.isFrozen && <Alert tone="warning">This wallet is frozen.</Alert>}
            <Facts
              columns={3}
              items={[
                ['Available', money(w.availableMinor, w.currency, w.minorUnits)],
                [
                  'Bonus',
                  `${money(w.bonusMinor, w.currency, w.minorUnits)}${w.bonusExpiresAt ? ` · expires ${when(w.bonusExpiresAt)}` : ''}`,
                ],
                ['Held for withdrawals', money(w.heldMinor, w.currency, w.minorUnits)],
              ]}
            />
            <Table
              rows={rows}
              rowKey={(t) => `${t.id}-${t.balance}`}
              empty="Nothing has gone in or out of this wallet yet."
              columns={[
                {
                  header: 'What',
                  cell: (t) => (
                    <span>
                      <span className="font-semibold">{TYPE_LABELS[t.type] ?? humanize(t.type)}</span>{' '}
                      {t.balance === 'BONUS' && <Pill tone="green">Bonus</Pill>}{' '}
                      {t.status === 'REVERSED' && <StatusPill status="REVERSED" />}
                      {t.description && <span className="block text-xs text-slate-500">{t.description}</span>}
                      {t.reversalOf && (
                        <span className="block text-xs text-slate-500">Reverses {t.reversalOf}</span>
                      )}
                    </span>
                  ),
                },
                {
                  header: 'Amount',
                  cell: (t) => (
                    <span className={t.direction === 'CREDIT' ? 'text-emerald-700' : ''}>
                      {t.direction === 'CREDIT' ? '+' : '−'}
                      {money(t.amountMinor, t.currency, w.minorUnits)}
                    </span>
                  ),
                  className: 'tabular-nums whitespace-nowrap font-semibold',
                },
                {
                  header: 'After',
                  cell: (t) => money(t.balanceAfterMinor, t.currency, w.minorUnits),
                  className: 'tabular-nums whitespace-nowrap text-slate-600',
                },
                {
                  header: 'When',
                  cell: (t) => (
                    <>
                      {when(t.createdAt)}
                      <span className="block text-xs text-slate-500">{t.reference}</span>
                    </>
                  ),
                  className: 'whitespace-nowrap text-slate-600',
                },
                {
                  header: '',
                  cell: (t) =>
                    finance && t.type === 'ADJUSTMENT' && t.status === 'POSTED' && !t.reversalOf ? (
                      <ConfirmAction
                        label="Reverse"
                        reason="required"
                        description={`Undoes ${t.reference} by posting its mirror image.`}
                        run={(reason) =>
                          unwrap(
                            api.POST('/api/v1/admin/wallet-transactions/{id}/reverse', {
                              // One reversal per adjustment: the key makes a repeated click harmless.
                              params: {
                                path: { id: t.id },
                                header: { 'Idempotency-Key': `reverse-${t.id}` },
                              },
                              body: { reason },
                            }),
                          )
                        }
                        onDone={() => void refresh()}
                      />
                    ) : null,
                },
              ]}
            />
            {history.hasNextPage && (
              <Button
                variant="secondary"
                onClick={() => void history.fetchNextPage()}
                busy={history.isFetchingNextPage}
              >
                Show older
              </Button>
            )}
          </div>
        )}
      </Loaded>
    </Panel>
  );
}

/** A manual credit or debit: for correcting mistakes, always with a reason, always in the audit log. */
function Adjust({ userId, currency }: { userId: string; currency: string }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID?.() ?? String(Date.now()));

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const amountMinor = moneyToMinor(amount);
    if (!amountMinor || amountMinor === '0') return setFailure('Enter an amount, e.g. 75.');
    if (reason.trim().length < 5) return setFailure('Write a reason of at least 5 characters.');
    setBusy(true);
    setFailure(null);
    try {
      await unwrap(
        api.POST('/api/v1/admin/wallets/{userId}/adjustments', {
          params: { path: { userId }, header: { 'Idempotency-Key': `${key}-${direction}-${amountMinor}` } },
          body: { direction, amountMinor, currency, reason: reason.trim() },
        }),
      );
      await refresh();
      setOpen(false);
      setAmount('');
      setReason('');
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Adjust balance
      </Button>
      {open && (
        <Sheet
          title="Adjust balance"
          onClose={() => !busy && setOpen(false)}
          footer={
            <Button className="w-full" busy={busy} onClick={() => void submit()}>
              {direction === 'CREDIT' ? 'Add' : 'Take'}{' '}
              {amount && moneyToMinor(amount) ? money(moneyToMinor(amount), currency) : 'money'}
            </Button>
          }
        >
          <form onSubmit={submit} noValidate className="space-y-4">
            <SelectField
              label="Direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'CREDIT' | 'DEBIT')}
              options={[
                ['CREDIT', 'Add money to the wallet'],
                ['DEBIT', 'Take money from the wallet'],
              ]}
            />
            <MoneyField
              label="Amount"
              currency={currency}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TextArea
              label="Reason (kept in the audit log)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            {failure && <Alert>{failure}</Alert>}
          </form>
        </Sheet>
      )}
    </>
  );
}
