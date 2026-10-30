import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createObjectUrl } from './create-object-url';

describe('createObjectUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('keeps previous object urls alive until the reactive root is disposed', () => {
    let nextUrlIndex = 0;

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:test-${nextUrlIndex++}`);
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const [getBlob, setBlob] = createSignal<Blob | undefined>(new Blob(['first']));

    let getObjectUrl!: () => string | undefined;
    const dispose = createRoot((dispose) => {
      getObjectUrl = createObjectUrl(getBlob);
      return dispose;
    });

    expect(getObjectUrl()).toBe('blob:test-0');
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

    setBlob(new Blob(['second']));

    expect(getObjectUrl()).toBe('blob:test-1');
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
    // The url still used by a mounted consumer must not be revoked
    expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

    setBlob(undefined);

    expect(getObjectUrl()).toBeUndefined();
    expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

    setBlob(new Blob(['third']));

    expect(getObjectUrl()).toBe('blob:test-2');

    dispose();

    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(3);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-0');
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-1');
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-2');
  });
});
