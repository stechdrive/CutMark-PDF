const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

type FilePickerHandle = {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
};

type WindowWithSaveFilePicker = typeof window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FilePickerHandle>;
};

const getWindowWithSaveFilePicker = () => window as WindowWithSaveFilePicker;

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

export const supportsStreamingZipSave = () =>
  typeof window !== 'undefined' &&
  typeof getWindowWithSaveFilePicker().showSaveFilePicker === 'function';

export const saveZipResponse = async (
  response: Response,
  fileName: string
): Promise<boolean> => {
  if (supportsStreamingZipSave() && response.body) {
    try {
      const handle = await getWindowWithSaveFilePicker().showSaveFilePicker?.({
        suggestedName: fileName,
        types: [
          {
            description: 'ZIP archive',
            accept: { 'application/zip': ['.zip'] },
          },
        ],
      });

      if (!handle) {
        return false;
      }

      const writable = await handle.createWritable();
      await response.body.pipeTo(writable);
      return true;
    } catch (error) {
      if (isAbortError(error)) {
        return false;
      }
      throw error;
    }
  }

  const blob = await response.blob();
  saveAs(blob, fileName);
  return true;
};
