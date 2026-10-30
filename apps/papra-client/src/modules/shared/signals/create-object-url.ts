import { onCleanup } from 'solid-js';

/**
 * Creates one object URL for a fixed blob. Call inside a keyed Show so the URL and its
 * consumer share a lifetime. Revocation waits until synchronous consumer cleanup finishes.
 */
export function createObjectUrl(blob: Blob): string {
  const objectUrl = URL.createObjectURL(blob);

  onCleanup(() => {
    queueMicrotask(() => {
      URL.revokeObjectURL(objectUrl);
    });
  });

  return objectUrl;
}
