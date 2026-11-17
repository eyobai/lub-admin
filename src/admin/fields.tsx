import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../lib/cx';

const INPUT =
  'mt-1 block w-full rounded-2xl border bg-white px-4 py-2.5 text-base text-ink placeholder:text-slate-400 focus:border-ink focus:outline-none';

function Wrap({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type Common = { label: string; hint?: ReactNode; error?: string | null; className?: string };

export function TextField({
  label,
  hint,
  error,
  className,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(INPUT, error ? 'border-red-500' : 'border-slate-300')}
      />
    </Wrap>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        rows={4}
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cx(INPUT, error ? 'border-red-500' : 'border-slate-300')}
      />
    </Wrap>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  options,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly (readonly [string, string])[] }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <select {...rest} id={id} className={cx(INPUT, 'border-slate-300')}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

/** Money typed in birr ("75" or "0.50"); the form keeps the text and converts it with {@link moneyToMinor}. */
export function MoneyField({
  currency = 'ETB',
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement> & { currency?: string }) {
  return (
    <TextField
      inputMode="decimal"
      autoComplete="off"
      placeholder="0.00"
      {...rest}
      label={`${rest.label} (${currency})`}
    />
  );
}
