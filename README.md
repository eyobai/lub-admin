# LyuBid Admin — back office

The staff website of the Lowest Unique Bid auction platform: products, auctions, winners and deliveries, users,
wallets, deposits, the ledger check and the audit trail. It is its own project and talks to the backend
(`lub-backend`) only through its admin API (`/api/v1/admin/...`).

Built like the public site (`lub-web`): React, TypeScript, Vite, Tailwind CSS, TanStack Query, and a client typed
from the backend's OpenAPI document. Desktop-first with a sidebar; it also works on a phone.

## Who can do what

Only accounts with a back-office role can sign in; a bidder account is turned away and its session ended. What
each role sees mirrors the backend's rules (the server checks every request again):

| Role        | Can                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Support     | Look everything up, reset passwords, sign people out, update deliveries                                                                                       |
| Finance     | Dashboard, deposits (ask Chapa again, resolve reviews), wallet adjustments and freezes, ledger check                                                          |
| Admin       | Dashboard, products, auctions (create, edit, schedule, open, cancel, finalize), winners (verify, reject, publish), account status, audit log, security events |
| Super admin | Everything, and gives out roles                                                                                                                               |

The first super admin is created on the backend: `SEED_ADMIN_PHONE=… SEED_ADMIN_PASSWORD=… npm run seed`.

## Pages

| Page            | What it does                                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard       | Revenue, money in wallets, what needs attention, auctions/bids/users/winners/deliveries at a glance                                                                                                            |
| Products        | List, search, create and edit: details, pictures (by address), specifications                                                                                                                                  |
| Auctions        | List by status; create a draft; edit; schedule, open now, back to draft, cancel (refunds fees), work out the result; rules, timeline, live statistics, every bid, the result with its histogram and a re-check |
| Winners         | Verify, reject, publish, unpublish; delivery details and status with its history                                                                                                                               |
| Users           | Search; suspend, block, reactivate; reset password (temporary password shown once); sign out everywhere; roles; their wallet with history, adjustments, reversals, freeze                                      |
| Deposits        | Top-ups and pay-and-bid payments; ask Chapa again; mark a flagged one reviewed                                                                                                                                 |
| Ledger check    | Recomputes every balance from the ledger and lists any mismatch                                                                                                                                                |
| Audit log       | Who changed what and when, with before/after                                                                                                                                                                   |
| Security events | Sign-ins, lockouts, suspicious bidding or payments                                                                                                                                                             |

Every action that changes something asks first, and where the backend keeps a reason in the audit log, asks
for it. Lists keep their filters and page in the address, so they can be bookmarked and shared.

## Running it

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5174
```

`VITE_API_BASE_URL` is the backend's address. The backend must allow this site's address in `CORS_ORIGINS`
(e.g. `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`), or serve both from one address:

```bash
VITE_API_BASE_URL=/ API_PROXY_TARGET=http://localhost:3000 npm run dev
```

Other scripts: `npm run check` (types, lint, format, tests, build), `npm test`, `npm run build`,
`npm run api:types` (regenerate the client after copying the backend's `docs/openapi.json` to `api/openapi.json`).

## Deploying

`npm run build` writes a static site to `dist/`. Serve it like the public site (see `lub-web/deploy`), on its own
host name, with `index.html` for unknown paths. The built page carries a strict Content-Security-Policy, and the
page asks search engines not to index it. Put it behind your VPN or an IP allow-list if you can: it is the key to
the money.
