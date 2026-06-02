import { supportsBrowserSavePicker } from '../adapters/files/browserFileSave';
import { saveBlobFile, saveStreamFile } from '../adapters/files/runtimeFileSave';
import { isTauriRuntime } from '../adapters/runtime/runtimeEnvironment';

export const supportsStreamingZipSave = () =>
  isTauriRuntime() || supportsBrowserSavePicker();

export const saveZipResponse = async (
  response: Response,
  fileName: string
): Promise<boolean> => {
  if (response.body) {
    const result = await saveStreamFile({
      stream: response.body,
      suggestedName: fileName,
      mimeType: 'application/zip',
      extensions: ['.zip'],
      description: 'ZIP archive',
    });

    return result.status === 'saved';
  }

  const blob = await response.blob();
  const result = await saveBlobFile({
    blob,
    suggestedName: fileName,
    mimeType: 'application/zip',
    extensions: ['.zip'],
    description: 'ZIP archive',
  });

  return result.status === 'saved';
};
