import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { session, type SignOutReason } from '../auth/session';
import { Alert, Button, Card, Field } from '../components/ui';
import { phoneError } from '../lib/validation';
import { usePageTitle } from '../lib/usePageTitle';

const SIGNED_OUT_NOTICE: Record<SignOutReason, string> = {
  expired: 'You were signed out. Please sign in again.',
  suspended: 'This account has been suspended. Please contact support.',
  blocked: 'This account has been blocked. Please contact support.',
};

export function SignInPage() {
  usePageTitle('Sign in');
  const { signIn } = useAuth();
  const [notice] = useState(() => session.takeSignOutReason());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string | null; password?: string | null }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = { phone: phoneError(phoneNumber), password: password ? null : 'Enter your password.' };
    setErrors(next);
    setFailure(null);
    if (next.phone || next.password) return;
    setBusy(true);
    try {
      // On success GuestOnly sends the user to the page they came from.
      await signIn(phoneNumber.trim(), password);
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          LyuBid Admin
        </div>
        <Card className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">Staff sign in</h1>
          <p className="mt-1 text-sm text-slate-600">For support, finance and admin accounts only.</p>
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {notice && !failure && <Alert tone="warning">{SIGNED_OUT_NOTICE[notice]}</Alert>}
            {failure && <Alert>{failure}</Alert>}
            <Field
              label="Phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0911 234 567"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              error={errors.phone}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <Button type="submit" busy={busy} className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            Forgot your password? Ask another admin to reset it for you.
          </p>
        </Card>
      </div>
    </div>
  );
}
