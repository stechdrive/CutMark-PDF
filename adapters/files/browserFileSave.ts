import {
  FileSavePort,
  SaveResult,
  normalizeBrowserAcceptExtensions,
} from './fileSavePort';

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

export const supportsBrowserSavePicker = () =>
  typeof window !== 'undefined' &&
  typeof getWindowWithSaveFilePicker().showSaveFilePicker === 'function';

const saveBlobWithAnchor = (blob: Blob, filename: string): SaveResult => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { status: 'saved' };
};

const createPickerTypes = (input: {
  mimeType: string;
  extensions: string[];
  description?: string;
}) => [
  {
    description: input.description ?? input.mimeType,
    accept: {
      [input.mimeType]: normalizeBrowserAcceptExtensions(input.extensions),
    },
  },
];

export const browserFileSave: FileSavePort = {
  async saveBlob(input) {
    return saveBlobWithAnchor(input.blob, input.suggestedName);
  },

  async saveText(input) {
    return this.saveBlob({
      ...input,
      blob: new Blob([input.text], { type: input.mimeType }),
    });
  },

  async saveStream(input) {
    if (supportsBrowserSavePicker()) {
      try {
        const handle = await getWindowWithSaveFilePicker().showSaveFilePicker?.({
          suggestedName: input.suggestedName,
          types: createPickerTypes(input),
        });

        if (!handle) {
          return { status: 'cancelled' };
        }

        const writable = await handle.createWritable();
        await input.stream.pipeTo(writable);
        return { status: 'saved' };
      } catch (error) {
        if (isAbortError(error)) {
          return { status: 'cancelled' };
        }
        throw error;
      }
    }

    const blob = await new Response(input.stream).blob();
    return saveBlobWithAnchor(blob, input.suggestedName);
  },
};
