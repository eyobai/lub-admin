import { useRef, useState } from 'react';
import { errorMessage } from '../api/errors';
import { Alert, Button } from '../components/ui';
import { api, unwrap, useOne } from './api';

/**
 * Sends pictures to the server, which stores them (Cloudflare R2) and returns their public addresses. Hidden while
 * the server has no storage set up: pictures are then added by address.
 */
export function PictureUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const settings = useOne(['upload-settings'], () => unwrap(api.GET('/api/v1/admin/uploads/settings')));
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (!settings.data?.enabled) return null;
  const { maxBytes, contentTypes } = settings.data;

  async function send(files: File[]) {
    setFailure(null);
    for (const [i, file] of files.entries()) {
      if (file.size > maxBytes) {
        setFailure(`${file.name} is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
        continue;
      }
      setBusy(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : 'Uploading…');
      try {
        const form = new FormData();
        form.append('file', file);
        const stored = await unwrap(
          api.POST('/api/v1/admin/uploads/images', {
            body: form as unknown as { file: string },
            bodySerializer: (body) => body as unknown as FormData,
          }),
        );
        onUploaded(stored.url);
      } catch (error) {
        setFailure(`${file.name}: ${errorMessage(error)}`);
      }
    }
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={contentTypes.join(',')}
        multiple
        hidden
        aria-label="Pictures to upload"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) void send(files);
        }}
      />
      <Button type="button" busy={busy !== null} onClick={() => input.current?.click()}>
        {busy ?? 'Upload pictures'}
      </Button>
      {failure && <Alert>{failure}</Alert>}
    </div>
  );
}
