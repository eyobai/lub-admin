import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { GuestOnly, Home, NoAccess, RequireRole, RequireStaff } from './auth/guards';
import { NEEDS } from './auth/roles';
import { AdminShell } from './components/AdminShell';
import { AuctionPage, NewAuctionPage } from './pages/AuctionPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { AuditPage } from './pages/AuditPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepositPage, DepositsPage } from './pages/DepositsPage';
import { LedgerPage } from './pages/LedgerPage';
import { NewProductPage, ProductPage } from './pages/ProductPage';
import { ProductsPage } from './pages/ProductsPage';
import { SecurityPage } from './pages/SecurityPage';
import { SignInPage } from './pages/SignInPage';
import { UserPage } from './pages/UserPage';
import { UsersPage } from './pages/UsersPage';
import { WinnerPage } from './pages/WinnerPage';
import { WinnersPage } from './pages/WinnersPage';
import { createQueryClient } from './queryClient';

/** Everything except the router, so tests can mount it at any address. */
export function App({ queryClient }: { queryClient?: QueryClient }) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="sign-in" element={<SignInPage />} />
          </Route>
          <Route element={<RequireStaff />}>
            <Route element={<AdminShell />}>
              <Route index element={<Home dashboard={<DashboardPage />} />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route element={<RequireRole needs={NEEDS.read} />}>
                <Route path="auctions" element={<AuctionsPage />} />
                <Route path="auctions/:id" element={<AuctionPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/:id" element={<ProductPage />} />
                <Route path="winners" element={<WinnersPage />} />
                <Route path="winners/:id" element={<WinnerPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/:id" element={<UserPage />} />
                <Route path="deposits" element={<DepositsPage />} />
                <Route path="deposits/:id" element={<DepositPage />} />
              </Route>
              <Route element={<RequireRole needs={NEEDS.manageCatalog} />}>
                <Route path="auctions/new" element={<NewAuctionPage />} />
                <Route path="products/new" element={<NewProductPage />} />
              </Route>
              <Route element={<RequireRole needs={NEEDS.money} />}>
                <Route path="ledger" element={<LedgerPage />} />
              </Route>
              <Route element={<RequireRole needs={NEEDS.audit} />}>
                <Route path="audit" element={<AuditPage />} />
                <Route path="security" element={<SecurityPage />} />
              </Route>
              <Route path="no-access" element={<NoAccess />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
    </div>
  );
}
