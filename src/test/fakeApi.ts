import { vi } from 'vitest';
import type { components } from '../api/schema';

type Schemas = components['schemas'];

export interface RecordedCall {
  method: string;
  path: string;
  query: URLSearchParams;
  authorization: string | null;
  idempotencyKey: string | null;
  contentType: string | null;
  body: unknown;
}

/** JSON bodies as objects; anything else (a multipart upload) as its raw text. */
const parseBody = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

type Reply = [status: number, body?: unknown];
type Handler = (call: RecordedCall) => Reply | Promise<Reply>;

/**
 * Replaces `fetch` with handlers keyed by "METHOD /path". A request with no handler fails the test with a
 * network error, like an unreachable server would.
 */
export function fakeApi(handlers: Record<string, Handler | Reply>) {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const text = await request.text();
    const call: RecordedCall = {
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      authorization: request.headers.get('authorization'),
      idempotencyKey: request.headers.get('idempotency-key'),
      contentType: request.headers.get('content-type'),
      body: text ? parseBody(text) : undefined,
    };
    calls.push(call);
    const handler = handlers[`${call.method} ${call.path}`];
    if (!handler) throw new TypeError(`No fake handler for ${call.method} ${call.path}`);
    const [status, body] = typeof handler === 'function' ? await handler(call) : handler;
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    callsTo: (key: string) => calls.filter((c) => `${c.method} ${c.path}` === key),
  };
}

export function apiError(statusCode: number, error: string, details?: Record<string, unknown>): Reply {
  return [
    statusCode,
    {
      statusCode,
      error,
      message: `server wording for ${error}`,
      details,
      path: '/x',
      requestId: 'req-1',
      timestamp: '2026-01-01T00:00:00.000Z',
    } satisfies Schemas['ErrorResponseDto'],
  ];
}

export function aUser(overrides: Partial<Schemas['AuthUserDto']> = {}): Schemas['AuthUserDto'] {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    phoneNumber: '+251911000001',
    phoneVerified: true,
    status: 'ACTIVE',
    roles: ['USER', 'ADMIN'],
    mustChangePassword: false,
    fullName: 'Selam Admin',
    email: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function tokens(): Schemas['TokenPairDto'] {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 2_592_000,
  };
}

export function anAuction(overrides: Partial<Schemas['AdminAuctionDto']> = {}): Schemas['AdminAuctionDto'] {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'iPhone 18 auction',
    description: null,
    status: 'DRAFT',
    currency: 'ETB',
    minorUnits: 2,
    bidFeeMinor: '7500',
    bidFee: '75.00',
    minBidMinor: '1',
    minBid: '0.01',
    maxBidMinor: '1000000',
    maxBid: '10000.00',
    bidStepMinor: '1',
    bidStep: '0.01',
    maxBidsPerUser: null,
    maxBidsPerRequest: 50,
    duplicateBidPolicy: 'REJECT_SAME_USER_SAME_AMOUNT',
    noUniqueBidPolicy: 'REFUND_BID_FEES',
    opensAt: '2026-12-01T09:00:00.000Z',
    closesAt: '2026-12-08T09:00:00.000Z',
    totalBidCount: 0,
    product: {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'iPhone 18',
      description: null,
      brand: 'Apple',
      model: null,
      currency: 'ETB',
      marketValueMinor: '18000000',
      marketValue: '180000.00',
      specifications: {},
      images: [],
    },
    serverTime: '2026-11-17T00:00:00.000Z',
    productStatus: 'AVAILABLE',
    version: 1,
    createdById: null,
    activatedAt: null,
    closedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    bidFeesRefundedAt: null,
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
    ...overrides,
  };
}
