import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/errors';
import { api, unwrap, useOne, useRefresh, type Schemas } from '../admin/api';
import { SelectField, TextArea, TextField } from '../admin/fields';
import { humanize, when } from '../admin/format';
import { Loaded, PageHeader, Panel, StatusPill } from '../admin/kit';
import { can, NEEDS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Alert, Button } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';
import { PRODUCT_STATUSES } from '../admin/constants';
import { PictureUpload } from '../admin/PictureUpload';

type Product = Schemas['ProductDto'];
type Status = (typeof PRODUCT_STATUSES)[number];

interface Form {
  name: string;
  brand: string;
  model: string;
  description: string;
  status: Status;
  images: { url: string; altText: string }[];
  specs: { key: string; value: string }[];
}

function toForm(p?: Product): Form {
  return {
    name: p?.name ?? '',
    brand: p?.brand ?? '',
    model: p?.model ?? '',
    description: p?.description ?? '',
    status: (p?.status as Status) ?? 'AVAILABLE',
    images: p?.images.map((i) => ({ url: i.url, altText: i.altText ?? '' })) ?? [],
    specs: Object.entries(p?.specifications ?? {})
      .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
      .map(([key, value]) => ({ key, value: String(value) })),
  };
}

export function NewProductPage() {
  usePageTitle('New product');
  return (
    <>
      <PageHeader
        title="New product"
        subtitle={
          <Link to="/products" className="underline">
            All products
          </Link>
        }
      />
      <ProductForm />
    </>
  );
}

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useOne(['product', id], () =>
    unwrap(api.GET('/api/v1/admin/products/{id}', { params: { path: { id } } })),
  );
  usePageTitle(product.data?.name ?? 'Product');
  return (
    <>
      <PageHeader
        title={product.data?.name ?? 'Product'}
        subtitle={
          product.data && (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={product.data.status} /> Updated {when(product.data.updatedAt)} ·{' '}
              <Link to={`/auctions?productId=${id}`} className="underline">
                Its auctions
              </Link>
            </span>
          )
        }
      />
      <Loaded query={product} label="Loading the product">
        {(p) => <ProductForm key={p.updatedAt} product={p} />}
      </Loaded>
    </>
  );
}

function ProductForm({ product }: { product?: Product }) {
  const { user } = useAuth();
  const editable = can(user?.roles, ...NEEDS.manageCatalog);
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [form, setForm] = useState<Form>(() => toForm(product));
  const [errors, setErrors] = useState<Partial<Record<'name', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = { name: form.name.trim() ? undefined : 'Give the product a name.' };
    setErrors(next);
    if (next.name) return;
    const body = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status,
      images: form.images
        .filter((i) => i.url.trim())
        .map((i) => ({ url: i.url.trim(), altText: i.altText.trim() || undefined })),
      specifications: Object.fromEntries(
        form.specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()]),
      ),
    };
    setBusy(true);
    setFailure(null);
    try {
      if (product) {
        await unwrap(
          api.PATCH('/api/v1/admin/products/{id}', { params: { path: { id: product.id } }, body }),
        );
        setSaved(true);
        await refresh();
      } else {
        const created = await unwrap(api.POST('/api/v1/admin/products', { body }));
        await refresh();
        navigate(`/products/${created.id}`, { replace: true });
      }
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset disabled={!editable} className="space-y-5">
        <Panel title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
              className="sm:col-span-2"
            />
            <TextField label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            <TextField label="Model" value={form.model} onChange={(e) => set('model', e.target.value)} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as Status)}
              options={PRODUCT_STATUSES.map((s) => [s, humanize(s)] as const)}
              hint="Only available products can go into a new auction."
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="sm:col-span-2"
            />
          </div>
        </Panel>

        <Panel
          title="Pictures"
          actions={
            editable && (
              <div className="flex flex-wrap items-start gap-2">
                <PictureUpload
                  onUploaded={(url) =>
                    setForm((f) => ({ ...f, images: [...f.images, { url, altText: '' }] }))
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => set('images', [...form.images, { url: '', altText: '' }])}
                >
                  Add by address
                </Button>
              </div>
            )
          }
        >
          {form.images.length === 0 && (
            <p className="text-sm text-slate-500">
              No pictures yet. Upload them, or add the address (https://…) of each one.
            </p>
          )}
          <ul className="space-y-3">
            {form.images.map((image, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3 rounded-2xl bg-slate-100 p-3">
                {/^https?:\/\//.test(image.url) ? (
                  <img
                    src={image.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-xl bg-white object-cover"
                  />
                ) : (
                  <span className="h-16 w-16 rounded-xl bg-white" />
                )}
                <TextField
                  label={`Picture ${i + 1} address`}
                  type="url"
                  placeholder="https://…"
                  value={image.url}
                  onChange={(e) =>
                    set(
                      'images',
                      form.images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                    )
                  }
                  className="min-w-[14rem] flex-1"
                />
                <TextField
                  label="Description for screen readers"
                  value={image.altText}
                  onChange={(e) =>
                    set(
                      'images',
                      form.images.map((x, j) => (j === i ? { ...x, altText: e.target.value } : x)),
                    )
                  }
                  className="min-w-[12rem] flex-1"
                />
                {editable && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={i === 0}
                      aria-label={`Move picture ${i + 1} up`}
                      onClick={() => {
                        const next = [...form.images];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        set('images', next);
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      aria-label={`Remove picture ${i + 1}`}
                      onClick={() =>
                        set(
                          'images',
                          form.images.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ×
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {form.images.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              The first picture is the one shown on auction cards.
            </p>
          )}
        </Panel>

        <Panel
          title="Specifications"
          actions={
            editable && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => set('specs', [...form.specs, { key: '', value: '' }])}
              >
                Add row
              </Button>
            )
          }
        >
          {form.specs.length === 0 && (
            <p className="text-sm text-slate-500">None. Add rows such as “Storage: 256 GB”.</p>
          )}
          <ul className="space-y-2">
            {form.specs.map((spec, i) => (
              <li key={i} className="flex flex-wrap items-end gap-2">
                <TextField
                  label="Name"
                  value={spec.key}
                  onChange={(e) =>
                    set(
                      'specs',
                      form.specs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)),
                    )
                  }
                  className="min-w-[10rem] flex-1"
                />
                <TextField
                  label="Value"
                  value={spec.value}
                  onChange={(e) =>
                    set(
                      'specs',
                      form.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    )
                  }
                  className="min-w-[10rem] flex-1"
                />
                {editable && (
                  <Button
                    type="button"
                    variant="danger"
                    aria-label={`Remove row ${i + 1}`}
                    onClick={() =>
                      set(
                        'specs',
                        form.specs.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </fieldset>

      {failure && <Alert>{failure}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}
      {editable ? (
        <Button type="submit" busy={busy}>
          {product ? 'Save changes' : 'Create product'}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">Only admins can change products.</p>
      )}
    </form>
  );
}
