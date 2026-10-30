import { createMemo, onCleanup } from 'solid-js';

/**
 * Creates an object URL for the current blob and keeps it stable across reactive updates.
 *
 * Unlike a naive memo that revokes the previous URL, this helper never revokes a URL while it
 * may still be in use. This matters for consumers that only read the URL once (e.g. PDF.js),
 * because revoking the URL they loaded from would break the preview. All created URLs are
 * revoked when the owning reactive root is disposed.
 */
export function createObjectUrl(source: () => Blob | undefined): () => string | undefined {
  const objectUrls = new Set<string>();

  const getObjectUrl = createMemo<string | undefined>(() => {
    const blob = source();

    if (!blob) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(blob);
    objectUrls.add(objectUrl);

    return objectUrl;
  });

  onCleanup(() => {
    for (const objectUrl of objectUrls) {
      URL.revokeObjectURL(objectUrl);
    }

    objectUrls.clear();
  });

  return getObjectUrl;
}
