import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from './auth/session';
import { aUser, anAuction, apiError, fakeApi, tokens } from './test/fakeApi';
import { renderApp } from './test/renderApp';

const ME = 'GET /api/v1/auth/me';
const LOGIN = 'POST /api/v1/auth/login';
const LOGOUT = 'POST /api/v1/auth/logout';
const AUCTIONS = 'GET /api/v1/admin/auctions';
const AUCTION = `GET /api/v1/admin/auctions/${anAuction().id}`;
const CANCEL = `POST /api/v1/admin/auctions/${anAuction().id}/cancel`;
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, limit: 20 });

function signedIn(roles: string[], handlers: Parameters<typeof fakeApi>[0] = {}) {
  const user = aUser({ roles: ['USER', ...roles] as never });
  session.start(user, tokens());
  return fakeApi({ [ME]: [200, user], ...handlers });
}

describe('signing in', () => {
  it('lets staff in and sends them to the first page their role may use', async () => {
    const user = aUser({ roles: ['USER', 'SUPPORT'] });
    fakeApi({
      [LOGIN]: [200, { user, tokens: tokens() }],
      [ME]: [200, user],
      [AUCTIONS]: [200, page([])],
    });
    const { user: u, address } = renderApp('/');
    expect(address()).toBe('/sign-in');

    await u.type(await screen.findByLabelText('Phone number'), '0911000001');
    await u.type(screen.getByLabelText('Password'), 'Secret123!');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    // Support has no dashboard: the first page they may use is Auctions.
    expect(await screen.findByRole('heading', { name: 'Auctions' })).toBeInTheDocument();
    expect(address()).toBe('/auctions');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ledger check' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
  });

  it('turns away a bidder account and ends its session', async () => {
    const fake = fakeApi({
      [LOGIN]: [200, { user: aUser({ roles: ['USER'] }), tokens: tokens() }],
      [LOGOUT]: [204],
    });
    const { user: u } = renderApp('/sign-in');
    await u.type(await screen.findByLabelText('Phone number'), '0911000001');
    await u.type(screen.getByLabelText('Password'), 'Secret123!');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This account has no back-office role');
    expect(session.get()).toBeNull();
    await waitFor(() => expect(fake.callsTo(LOGOUT)).toHaveLength(1));
  });

  it('shows wrong credentials plainly', async () => {
    fakeApi({ [LOGIN]: apiError(401, 'INVALID_CREDENTIALS') });
    const { user: u } = renderApp('/sign-in');
    await u.type(await screen.findByLabelText('Phone number'), '0911000001');
    await u.type(screen.getByLabelText('Password'), 'wrong');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The phone number or password is incorrect.');
  });
});

describe('what each role sees', () => {
  it('gives a super admin every part of the back office', async () => {
    signedIn(['SUPER_ADMIN'], { [AUCTIONS]: [200, page([])] });
    renderApp('/auctions');
    const nav = await screen.findByRole('navigation', { name: 'Back office' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Dashboard',
      'Auctions',
      'Products',
      'Winners',
      'Users',
      'Deposits',
      'Ledger check',
      'Audit log',
      'Security events',
    ]);
    expect(screen.getByRole('link', { name: 'New auction' })).toBeInTheDocument();
  });

  it('says so when a role opens a page it may not use', async () => {
    signedIn(['SUPPORT']);
    renderApp('/ledger');
    expect(await screen.findByRole('heading', { name: 'Not for your role' })).toBeInTheDocument();
  });

  it('does not offer finance actions to support', async () => {
    signedIn(['SUPPORT'], { [AUCTION]: [200, anAuction({ status: 'ACTIVE' })] });
    renderApp(`/auctions/${anAuction().id}`);
    expect(await screen.findByRole('heading', { name: 'iPhone 18 auction' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel auction' })).not.toBeInTheDocument();
  });
});

describe('an auction', () => {
  it('offers the actions its status allows', async () => {
    signedIn(['ADMIN'], { [AUCTION]: [200, anAuction({ status: 'DRAFT' })] });
    renderApp(`/auctions/${anAuction().id}`);
    expect(await screen.findByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to draft' })).not.toBeInTheDocument();
  });

  it('cancels only with a reason, and sends it', async () => {
    const fake = signedIn(['ADMIN'], {
      [AUCTION]: [200, anAuction({ status: 'ACTIVE', totalBidCount: 12 })],
      [CANCEL]: [200, anAuction({ status: 'CANCELLED' })],
      [`GET /api/v1/admin/auctions/${anAuction().id}/statistics`]: apiError(404, 'NOT_FOUND'),
      [`GET /api/v1/admin/auctions/${anAuction().id}/bids`]: [200, page([])],
    });
    const { user } = renderApp(`/auctions/${anAuction().id}`);
    await user.click(await screen.findByRole('button', { name: 'Cancel auction' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel auction' });
    expect(dialog).toHaveTextContent('12 bids were placed. Every bid fee is refunded');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel the auction' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Write at least 5 characters.');
    expect(fake.callsTo(CANCEL)).toHaveLength(0);

    await user.type(within(dialog).getByLabelText(/Reason/), 'Supplier fell through');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel the auction' }));
    await waitFor(() => expect(fake.callsTo(CANCEL)).toHaveLength(1));
    expect(fake.callsTo(CANCEL)[0].body).toEqual({ reason: 'Supplier fell through' });
  });

  it("shows the server's reason when a rule is broken", async () => {
    signedIn(['ADMIN'], {
      [AUCTION]: [200, anAuction({ status: 'DRAFT' })],
      [`POST /api/v1/admin/auctions/${anAuction().id}/schedule`]: apiError(409, 'AUCTION_INVALID_STATE'),
    });
    const { user } = renderApp(`/auctions/${anAuction().id}`);
    await user.click(await screen.findByRole('button', { name: 'Schedule' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Schedule' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('server wording for AUCTION_INVALID_STATE');
  });
});
