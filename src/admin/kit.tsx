import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/errors';
import { Alert, Button, PageLoading, Spinner } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { cx } from '../lib/cx';
import { humanize } from './format';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgb(22_21_19/0.04)]', className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-bold">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  neutral: 'bg-slate-200 text-slate-700',
  gold: 'bg-brand-500 text-ink',
  dark: 'bg-ink text-white',
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Colour for the statuses the API returns, so the same word looks the same on every page. */
const STATUS_TONES: Record<string, Tone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'blue',
  ACTIVE: 'gold',
  CLOSING: 'dark',
  COMPLETED: 'green',
  CANCELLED: 'red',
  AVAILABLE: 'green',
  RESERVED: 'amber',
  UNAVAILABLE: 'neutral',
  ARCHIVED: 'neutral',
  SUSPENDED: 'amber',
  BLOCKED: 'red',
  PENDING_VERIFICATION: 'amber',
  VERIFIED: 'green',
  REJECTED: 'red',
  PENDING: 'amber',
  CONTACTED: 'blue',
  DISPATCHED: 'blue',
  DELIVERED: 'green',
  DISPUTED: 'red',
  INITIATED: 'neutral',
  SUCCEEDED: 'green',
  FAILED: 'red',
  EXPIRED: 'neutral',
  POSTED: 'green',
  REVERSED: 'neutral',
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <Pill tone={STATUS_TONES[status] ?? 'neutral'}>{label ?? humanize(status)}</Pill>;
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** A list of records. `link` makes the first column a link to the record's page. */
export function Table<T>({
  rows,
  columns,
  rowKey,
  link,
  empty = 'Nothing to show.',
  dim = false,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  link?: (row: T) => string;
  empty?: string;
  dim?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
        {empty}
      </p>
    );
  }
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-3xl bg-white shadow-[0_1px_2px_rgb(22_21_19/0.04)]',
        dim && 'opacity-60',
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                className={cx('px-4 py-3 font-semibold whitespace-nowrap', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50">
              {columns.map((c, i) => (
                <td
                  key={c.header}
                  className={cx('px-4 py-3 align-top', i === 0 && 'min-w-[10rem]', c.className)}
                >
                  {i === 0 && link ? (
                    <Link
                      to={link(row)}
                      className="font-semibold text-ink underline-offset-2 hover:underline"
                    >
                      {c.cell(row)}
                    </Link>
                  ) : (
                    c.cell(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-2">{children}</div>;
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-ink"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {humanize(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A search box that only asks when the person stops typing or presses Enter. */
export function SearchFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(text.trim());
      }}
      className="text-xs font-semibold text-slate-600"
    >
      <label>
        {label}
        <input
          type="search"
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => text.trim() !== value && onChange(text.trim())}
          className="mt-1 block w-64 max-w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-ink"
        />
      </label>
    </form>
  );
}

/** Loading, failure with a retry, or the content. */
export function Loaded<T>({
  query,
  label,
  children,
}: {
  query: {
    data?: T;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    isFetching: boolean;
  };
  label: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <PageLoading label={label} />;
  if (query.isError || query.data === undefined) {
    return (
      <div className="space-y-3">
        <Alert>{errorMessage(query.error)}</Alert>
        <Button variant="secondary" onClick={() => void query.refetch()} busy={query.isFetching}>
          Try again
        </Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}

export function Facts({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cx(
        'grid gap-2 text-sm',
        columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
      )}
    >
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-100 px-4 py-2.5">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="font-semibold break-words">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A button that asks before doing something, and (with `reason`) asks why: the reason goes into the audit log.
 * `run` gets the reason and returns the request; the dialog closes when it succeeds and shows the refusal if not.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  reason,
  reasonLabel = 'Reason (kept in the audit log)',
  danger = false,
  variant,
  run,
  onDone,
}: {
  label: string;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** Ask for a reason; `optional` lets it be left empty. */
  reason?: 'required' | 'optional';
  reasonLabel?: string;
  danger?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'dark';
  run: (reason: string) => Promise<unknown>;
  onDone?: (result: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const tooShort = reason === 'required' && text.trim().length < 5;

  async function confirm() {
    if (tooShort) {
      setFailure('Write at least 5 characters.');
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const result = await run(text.trim());
      setOpen(false);
      setText('');
      onDone?.(result);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant ?? (danger ? 'danger' : 'secondary')} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <Sheet
          title={title ?? label}
          onClose={() => !busy && setOpen(false)}
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>
                Back
              </Button>
              <Button
                variant={danger ? 'danger' : 'primary'}
                className="flex-1"
                onClick={() => void confirm()}
                busy={busy}
              >
                {confirmLabel ?? label}
              </Button>
            </div>
          }
        >
          {description && <div className="text-sm text-slate-700">{description}</div>}
          {reason && (
            <label className="block text-sm font-semibold text-slate-700">
              {reasonLabel}
              {reason === 'optional' && <span className="font-normal text-slate-500"> (optional)</span>}
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-normal"
              />
            </label>
          )}
          {failure && <Alert>{failure}</Alert>}
        </Sheet>
      )}
    </>
  );
}

export function Busy() {
  return <Spinner className="h-4 w-4" />;
}
