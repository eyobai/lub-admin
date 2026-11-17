import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useNavLinks } from '../components/navLinks';
import { can, type Role } from './roles';
import { returnPath } from './returnPath';
import { useAuth } from './useAuth';

/** Everything except signing in needs a staff member; one who must choose a new password does that first. */
export function RequireStaff() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** The sign-in page: someone already signed in is sent on. */
export function GuestOnly() {
  const { user } = useAuth();
  const location = useLocation();
  return user ? <Navigate to={returnPath(location.state)} replace /> : <Outlet />;
}

/** A part of the back office this role cannot use says so, instead of showing a page of refusals. */
export function RequireRole({ needs }: { needs: readonly Role[] }) {
  const { user } = useAuth();
  if (can(user?.roles, ...needs)) return <Outlet />;
  return <NoAccess />;
}

/** The dashboard is not for every role: the others start at the first page they may use. */
export function Home({ dashboard }: { dashboard: React.ReactNode }) {
  const { user } = useAuth();
  const links = useNavLinks();
  if (can(user?.roles, 'FINANCE', 'ADMIN')) return <>{dashboard}</>;
  return <Navigate to={links[0]?.to ?? '/no-access'} replace />;
}

export function NoAccess() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Not for your role</h1>
      <p className="mt-2 text-slate-600">
        Ask a super admin if you need access to this part of the back office.
      </p>
    </div>
  );
}
