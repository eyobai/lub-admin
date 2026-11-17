import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../api/errors';
import { api, unwrap, useOne, useRefresh, type Schemas } from '../admin/api';
import { TextArea, TextField } from '../admin/fields';
import { humanize, money, when } from '../admin/format';
import { ConfirmAction, Facts, Loaded, PageHeader, Panel, StatusPill } from '../admin/kit';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Alert, Button } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

type Winner = Schemas['AdminWinnerDto'];
type DeliveryStatus = Schemas['SetDeliveryStatusDto']['status'];

export function WinnerPage() {
  const { id = '' } = useParams();
  const winner = useOne(['winner', id], () =>
    unwrap(api.GET('/api/v1/admin/winners/{id}', { params: { path: { id } } })),
  );
  usePageTitle(winner.data ? `Winner: ${winner.data.productName}` : 'Winner');
  return (
    <Loaded query={winner} label="Loading the winner">
      {(w) => <WinnerDetail winner={w} />}
    </Loaded>
  );
}

function WinnerDetail({ winner: w }: { winner: Winner }) {
  const { user } = useAuth();
  const judge = can(user?.roles, ...NEEDS.judgeWinners);
  const delivery = can(user?.roles, ...NEEDS.delivery);
  const refresh = useRefresh();
  const path = { params: { path: { id: w.id } } };
  const done = () => void refresh();

  return (
    <>
      <PageHeader
        title={w.productName}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={w.verificationStatus} />
            {w.publishedAt ? (
              <StatusPill status="VERIFIED" label={`Published ${when(w.publishedAt)}`} />
            ) : null}
            <Link to={`/auctions/${w.auctionId}`} className="underline">
              {w.auctionTitle}
            </Link>
          </span>
        }
        actions={
          judge && (
            <>
              {w.verificationStatus !== 'VERIFIED' && (
                <ConfirmAction
                  label="Verify"
                  variant="primary"
                  reason="optional"
                  reasonLabel="Note"
                  description="The result is recomputed from the bids first and must still name this bid. Verifying opens the delivery."
                  run={(note) =>
                    unwrap(
                      api.POST('/api/v1/admin/winners/{id}/verify', {
                        ...path,
                        body: { note: note || undefined },
                      }),
                    )
                  }
                  onDone={done}
                />
              )}
              {w.verificationStatus === 'PENDING_VERIFICATION' && (
                <ConfirmAction
                  label="Reject"
                  danger
                  reason="required"
                  description="For a win that breaks the rules, for example several accounts of one person."
                  run={(reason) =>
                    unwrap(api.POST('/api/v1/admin/winners/{id}/reject', { ...path, body: { reason } }))
                  }
                  onDone={done}
                />
              )}
              {w.verificationStatus === 'VERIFIED' && !w.publishedAt && (
                <ConfirmAction
                  label="Publish"
                  variant="dark"
                  description="Shows this win in the public recent-winners list, with the phone number partly hidden."
                  run={() => unwrap(api.POST('/api/v1/admin/winners/{id}/publish', path))}
                  onDone={done}
                />
              )}
              {w.publishedAt && (
                <ConfirmAction
                  label="Unpublish"
                  description="Takes this win off the public recent-winners list."
                  run={() => unwrap(api.POST('/api/v1/admin/winners/{id}/unpublish', path))}
                  onDone={done}
                />
              )}
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="The win">
          <Facts
            items={[
              ['Winning bid', money(w.amountMinor, w.currency)],
              [
                'Winner',
                <Link key="u" to={`/users/${w.userId}`} className="underline">
                  {w.fullName ?? w.phoneNumber}
                </Link>,
              ],
              ['Phone', w.phoneNumber],
              ['Won', when(w.createdAt)],
              ['Verified', when(w.verifiedAt)],
              ['Note', w.verificationNote ?? '—'],
            ]}
          />
        </Panel>
        {w.delivery ? (
          <Delivery winner={w} delivery={w.delivery} canChange={delivery} />
        ) : (
          <Panel title="Delivery">
            <p className="text-sm text-slate-600">Delivery starts once the win is verified.</p>
          </Panel>
        )}
      </div>
    </>
  );
}

function Delivery({
  winner: w,
  delivery: d,
  canChange,
}: {
  winner: Winner;
  delivery: Schemas['AdminDeliveryDto'];
  canChange: boolean;
}) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const path = { params: { path: { id: w.id } } };
  const address = d.address;
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Delivery <StatusPill status={d.status} />
        </span>
      }
      actions={
        canChange && (
          <>
            {!editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit details
              </Button>
            )}
            {d.allowedNextStatuses.map((next) => (
              <ConfirmAction
                key={next}
                label={`Mark ${humanize(next).toLowerCase()}`}
                variant={next === 'DISPUTED' ? 'danger' : next === 'DELIVERED' ? 'primary' : 'secondary'}
                reason="optional"
                reasonLabel="Note"
                run={(note) =>
                  unwrap(
                    api.POST('/api/v1/admin/winners/{id}/delivery/status', {
                      ...path,
                      body: { status: next as DeliveryStatus, note: note || undefined },
                    }),
                  )
                }
                onDone={() => void refresh()}
              />
            ))}
          </>
        )
      }
    >
      {editing ? (
        <DeliveryForm winner={w} delivery={d} onDone={() => setEditing(false)} />
      ) : (
        <div className="space-y-4">
          <Facts
            items={[
              ['Recipient', d.recipientName ?? '—'],
              ['Recipient phone', d.recipientPhone ?? '—'],
              [
                'Address',
                address
                  ? [
                      address.houseNumber,
                      address.woreda && `Woreda ${address.woreda}`,
                      address.subCity,
                      address.city,
                      address.region,
                      address.landmark && `near ${address.landmark}`,
                    ]
                      .filter(Boolean)
                      .join(', ')
                  : '—',
              ],
              ['Tracking', d.trackingInfo ?? '—'],
              ['Notes', d.notes ?? '—'],
              ['Updated', when(d.updatedAt)],
            ]}
          />
          {d.events.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">History</h3>
              <ol className="space-y-1 text-sm">
                {d.events.map((e, i) => (
                  <li key={i} className="rounded-2xl bg-slate-100 px-4 py-2">
                    <span className="font-semibold">
                      {e.fromStatus ? `${humanize(e.fromStatus)} → ` : ''}
                      {humanize(e.toStatus)}
                    </span>{' '}
                    <span className="text-slate-500">· {when(e.createdAt)}</span>
                    {e.note && <p className="text-slate-600">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function DeliveryForm({
  winner: w,
  delivery: d,
  onDone,
}: {
  winner: Winner;
  delivery: Schemas['AdminDeliveryDto'];
  onDone: () => void;
}) {
  const refresh = useRefresh();
  const [form, setForm] = useState({
    recipientName: d.recipientName ?? '',
    recipientPhone: d.recipientPhone ?? '',
    city: d.address?.city ?? '',
    trackingInfo: d.trackingInfo ?? '',
    notes: d.notes ?? '',
  });
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form, label: string, wide = false) => (
    <TextField
      label={label}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className={wide ? 'sm:col-span-2' : undefined}
    />
  );
  const text = (v: string) => v.trim() || undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      await unwrap(
        api.PATCH('/api/v1/admin/winners/{id}/delivery', {
          params: { path: { id: w.id } },
          body: {
            recipientName: text(form.recipientName),
            recipientPhone: text(form.recipientPhone),
            // Like the winner's own form: the city only; the rest of the address is arranged on the phone.
            address: form.city.trim() ? { city: form.city.trim() } : undefined,
            trackingInfo: text(form.trackingInfo),
            notes: text(form.notes),
          },
        }),
      );
      await refresh();
      onDone();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('recipientName', 'Recipient name')}
        {field('recipientPhone', 'Recipient phone')}
        {field('city', 'City or town')}
        {field('trackingInfo', 'Tracking', true)}
      </div>
      <TextArea
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />
      {failure && <Alert>{failure}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" busy={busy}>
          Save delivery details
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
