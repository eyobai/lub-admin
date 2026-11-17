import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/errors';
import { api, unwrap, useOne, type Schemas } from '../admin/api';
import { MoneyField, SelectField, TextArea, TextField } from '../admin/fields';
import { fromLocalInput, minorToText, money, moneyToMinor, toLocalInput } from '../admin/format';
import { Panel } from '../admin/kit';
import { Alert, Button } from '../components/ui';

type Auction = Schemas['AdminAuctionDto'];
export type AuctionBody = Schemas['CreateAuctionDto'];

const DUPLICATE = [
  ['REJECT_SAME_USER_SAME_AMOUNT', 'A bidder may bid each amount once'],
  ['ALLOW_SAME_USER_SAME_AMOUNT', 'A bidder may bid the same amount again'],
] as const;
const NO_UNIQUE = [
  ['NO_WINNER', 'Nobody wins, fees are kept'],
  ['REFUND_BID_FEES', 'Nobody wins, every fee is refunded'],
] as const;

interface Form {
  productId: string;
  title: string;
  description: string;
  bidFee: string;
  minBid: string;
  maxBid: string;
  bidStep: string;
  maxBidsPerUser: string;
  maxBidsPerRequest: string;
  opensAt: string;
  closesAt: string;
  duplicateBidPolicy: NonNullable<AuctionBody['duplicateBidPolicy']>;
  noUniqueBidPolicy: NonNullable<AuctionBody['noUniqueBidPolicy']>;
}

const inHours = (h: number) => toLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());

function toForm(a?: Auction): Form {
  return {
    productId: a?.product.id ?? '',
    title: a?.title ?? '',
    description: a?.description ?? '',
    bidFee: minorToText(a?.bidFeeMinor) || '',
    minBid: minorToText(a?.minBidMinor) || '0.01',
    maxBid: minorToText(a?.maxBidMinor) || '10000',
    bidStep: minorToText(a?.bidStepMinor) || '0.01',
    maxBidsPerUser: a?.maxBidsPerUser?.toString() ?? '',
    maxBidsPerRequest: a?.maxBidsPerRequest?.toString() ?? '50',
    opensAt: a ? toLocalInput(a.opensAt) : inHours(1),
    closesAt: a ? toLocalInput(a.closesAt) : inHours(24 * 7),
    duplicateBidPolicy: a?.duplicateBidPolicy ?? 'REJECT_SAME_USER_SAME_AMOUNT',
    noUniqueBidPolicy: (a?.noUniqueBidPolicy as Form['noUniqueBidPolicy']) ?? 'REFUND_BID_FEES',
  };
}

type Errors = Partial<Record<keyof Form, string>>;

/** Create or edit an auction. Times are typed in this browser's time zone and sent as exact moments. */
export function AuctionForm({
  auction,
  submitLabel,
  onSubmit,
}: {
  auction?: Auction;
  submitLabel: string;
  onSubmit: (body: AuctionBody) => Promise<void>;
}) {
  const [form, setForm] = useState<Form>(() => toForm(auction));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const products = useOne(['products', 'available'], () =>
    unwrap(api.GET('/api/v1/admin/products', { params: { query: { status: 'AVAILABLE', limit: 100 } } })),
  );
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const choices = [...(products.data?.items ?? [])];
  if (auction && !choices.some((p) => p.id === auction.product.id)) {
    choices.unshift({ ...auction.product, status: auction.productStatus } as never);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const bidFeeMinor = moneyToMinor(form.bidFee);
    const minBidMinor = moneyToMinor(form.minBid);
    const maxBidMinor = moneyToMinor(form.maxBid);
    const bidStepMinor = moneyToMinor(form.bidStep);
    const opensAt = fromLocalInput(form.opensAt);
    const closesAt = fromLocalInput(form.closesAt);
    const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);
    const next: Errors = {
      productId: form.productId ? undefined : 'Choose the prize.',
      title: form.title.trim() ? undefined : 'Give the auction a title.',
      bidFee: bidFeeMinor && bidFeeMinor !== '0' ? undefined : 'Enter the fee per bid, e.g. 75.',
      minBid: minBidMinor && minBidMinor !== '0' ? undefined : 'Enter the lowest amount, e.g. 0.01.',
      maxBid:
        maxBidMinor && minBidMinor && BigInt(maxBidMinor) > BigInt(minBidMinor)
          ? undefined
          : 'Enter a highest amount above the lowest.',
      bidStep: bidStepMinor && bidStepMinor !== '0' ? undefined : 'Enter the step, e.g. 0.01.',
      maxBidsPerUser:
        !form.maxBidsPerUser.trim() || whole(form.maxBidsPerUser)
          ? undefined
          : 'A whole number, or empty for no limit.',
      maxBidsPerRequest: whole(form.maxBidsPerRequest) ? undefined : 'A whole number, e.g. 50.',
      opensAt: opensAt ? undefined : 'Choose when bidding opens.',
      closesAt:
        closesAt && opensAt && closesAt > opensAt ? undefined : 'Choose a closing time after the opening.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    setFailure(null);
    try {
      await onSubmit({
        productId: form.productId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        bidFeeMinor: bidFeeMinor!,
        minBidMinor: minBidMinor!,
        maxBidMinor: maxBidMinor!,
        bidStepMinor: bidStepMinor!,
        maxBidsPerUser: whole(form.maxBidsPerUser) ?? undefined,
        maxBidsPerRequest: whole(form.maxBidsPerRequest)!,
        opensAt: opensAt!,
        closesAt: closesAt!,
        duplicateBidPolicy: form.duplicateBidPolicy,
        noUniqueBidPolicy: form.noUniqueBidPolicy,
      });
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Panel title="Prize and wording">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Prize"
            value={form.productId}
            onChange={(e) => set('productId', e.target.value)}
            error={errors.productId}
            options={[
              ['', products.isPending ? 'Loading products…' : 'Choose a product'] as const,
              ...choices.map(
                (p) => [p.id, `${p.name} — worth ${money(p.marketValueMinor, p.currency)}`] as const,
              ),
            ]}
            hint="Only available products are listed."
            className="sm:col-span-2"
          />
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            className="sm:col-span-2"
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </Panel>
      <Panel title="Bidding rules">
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField
            label="Fee per bid"
            value={form.bidFee}
            onChange={(e) => set('bidFee', e.target.value)}
            error={errors.bidFee}
          />
          <MoneyField
            label="Lowest bid"
            value={form.minBid}
            onChange={(e) => set('minBid', e.target.value)}
            error={errors.minBid}
          />
          <MoneyField
            label="Highest bid"
            value={form.maxBid}
            onChange={(e) => set('maxBid', e.target.value)}
            error={errors.maxBid}
          />
          <MoneyField
            label="Bids go up in steps of"
            value={form.bidStep}
            onChange={(e) => set('bidStep', e.target.value)}
            error={errors.bidStep}
          />
          <TextField
            label="Bids per person"
            inputMode="numeric"
            value={form.maxBidsPerUser}
            onChange={(e) => set('maxBidsPerUser', e.target.value)}
            error={errors.maxBidsPerUser}
            hint="Empty: no limit."
          />
          <TextField
            label="Bids per request"
            inputMode="numeric"
            value={form.maxBidsPerRequest}
            onChange={(e) => set('maxBidsPerRequest', e.target.value)}
            error={errors.maxBidsPerRequest}
            hint="How many amounts one payment may place."
          />
          <SelectField
            label="Same amount twice"
            value={form.duplicateBidPolicy}
            onChange={(e) => set('duplicateBidPolicy', e.target.value as Form['duplicateBidPolicy'])}
            options={DUPLICATE}
            className="sm:col-span-3"
          />
          <SelectField
            label="If no amount is bid exactly once"
            value={form.noUniqueBidPolicy}
            onChange={(e) => set('noUniqueBidPolicy', e.target.value as Form['noUniqueBidPolicy'])}
            options={NO_UNIQUE}
            className="sm:col-span-3"
          />
        </div>
      </Panel>
      <Panel title="Timing">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Bidding opens"
            type="datetime-local"
            value={form.opensAt}
            onChange={(e) => set('opensAt', e.target.value)}
            error={errors.opensAt}
          />
          <TextField
            label="Bidding closes"
            type="datetime-local"
            value={form.closesAt}
            onChange={(e) => set('closesAt', e.target.value)}
            error={errors.closesAt}
            hint="In your own time zone."
          />
        </div>
      </Panel>
      {failure && <Alert>{failure}</Alert>}
      <Button type="submit" busy={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
