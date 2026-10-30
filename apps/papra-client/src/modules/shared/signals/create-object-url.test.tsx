import { children, createRoot, createSignal, onCleanup, Show } from 'solid-js';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createObjectUrl } from './create-object-url';

describe('createObjectUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('releases each replaced blob after its keyed consumer is cleaned up', async () => {
    const events: string[] = [];
    let nextUrlIndex = 0;
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:test-${nextUrlIndex++}`);
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
      events.push(`revoke:${url}`);
    });
    const firstBlob = new Blob(['first']);
    const [getBlob, setBlob] = createSignal<Blob | undefined>(firstBlob);

    const { getUrl, dispose } = createRoot((dispose) => {
      const view = (
        <Show when={getBlob()} keyed>
          {(blob) => {
            const url = createObjectUrl(blob);
            // Simulate consumer cleanup registered after URL creation.
            onCleanup(() => events.push(`dispose:${url}`));
            return url;
          }}
        </Show>
      );
      return { getUrl: children(() => view), dispose };
    });

    try {
      expect(getUrl()).toBe('blob:test-0');
      expect(createObjectUrlSpy).toHaveBeenCalledWith(firstBlob);
      setBlob(firstBlob);
      expect(getUrl()).toBe('blob:test-0');
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

      // Repeated refetches must not retain historical blobs until page disposal.
      for (let i = 1; i <= 10; i++) {
        setBlob(new Blob([`replacement-${i}`]));
        expect(getUrl()).toBe(`blob:test-${i}`);
        await Promise.resolve();
        expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(i);
        expect(events.slice(-2)).toEqual([
          `dispose:blob:test-${i - 1}`,
          `revoke:blob:test-${i - 1}`,
        ]);
        expect(revokeObjectUrlSpy).not.toHaveBeenCalledWith(`blob:test-${i}`);
      }

      setBlob(undefined);
      expect(getUrl()).toBeUndefined();
      await Promise.resolve();
      expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(11);

      setBlob(new Blob(['last']));
      expect(getUrl()).toBe('blob:test-11');
    } finally {
      dispose();
      await Promise.resolve();
    }

    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(12);
    expect(events.slice(-2)).toEqual(['dispose:blob:test-11', 'revoke:blob:test-11']);
  });
});
