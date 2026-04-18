import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { saveZipResponse, supportsStreamingZipSave } from '../../services/zipDownload';

type WindowWithSaveFilePicker = typeof window & {
  showSaveFilePicker?: (...args: unknown[]) => Promise<{
    createWritable: () => Promise<WritableStream<Uint8Array>>;
  }>;
};

const createReadableResponse = (text: string) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    })
  );

describe('zipDownload', () => {
  const windowWithSaveFilePicker = window as WindowWithSaveFilePicker;
  const originalShowSaveFilePicker = windowWithSaveFilePicker.showSaveFilePicker;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete windowWithSaveFilePicker.showSaveFilePicker;
  });

  afterEach(() => {
    if (originalShowSaveFilePicker) {
      windowWithSaveFilePicker.showSaveFilePicker = originalShowSaveFilePicker;
    } else {
      delete windowWithSaveFilePicker.showSaveFilePicker;
    }
  });

  it('falls back to blob download when save picker is unavailable', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = await saveZipResponse(new Response(new Blob(['zip'])), 'marked_images.zip');

    expect(result).toBe(true);
    expect(supportsStreamingZipSave()).toBe(false);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('streams directly to a picked file when the save picker is available', async () => {
    const chunks: Uint8Array[] = [];
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip');

    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    const createWritable = vi.fn().mockResolvedValue(writable);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable,
    });

    windowWithSaveFilePicker.showSaveFilePicker = showSaveFilePicker;

    const result = await saveZipResponse(
      createReadableResponse('zip-data'),
      'marked_images.zip'
    );

    expect(result).toBe(true);
    expect(supportsStreamingZipSave()).toBe(true);
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(createWritable).toHaveBeenCalledTimes(1);
    expect(chunks.length).toBeGreaterThan(0);
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });

  it('treats picker cancellation as a non-error', async () => {
    windowWithSaveFilePicker.showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('User cancelled', 'AbortError'));

    await expect(
      saveZipResponse(createReadableResponse('zip'), 'marked_images.zip')
    ).resolves.toBe(false);
  });
});
