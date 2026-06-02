import {
  FileSavePort,
  SaveResult,
  normalizeFileExtensions,
} from './fileSavePort';

const selectSavePath = async (input: {
  suggestedName: string;
  extensions: string[];
  description?: string;
}) => {
  const { save } = await import('@tauri-apps/plugin-dialog');
  return save({
    defaultPath: input.suggestedName,
    filters: [
      {
        name: input.description ?? 'File',
        extensions: normalizeFileExtensions(input.extensions),
      },
    ],
  });
};

const cancelled = (): SaveResult => ({ status: 'cancelled' });

export const tauriFileSave: FileSavePort = {
  async saveBlob(input) {
    const path = await selectSavePath(input);
    if (!path) {
      return cancelled();
    }

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(path, new Uint8Array(await input.blob.arrayBuffer()));
    return { status: 'saved', path };
  },

  async saveText(input) {
    const path = await selectSavePath(input);
    if (!path) {
      return cancelled();
    }

    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, input.text);
    return { status: 'saved', path };
  },

  async saveStream(input) {
    const path = await selectSavePath(input);
    if (!path) {
      return cancelled();
    }

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(path, input.stream);
    return { status: 'saved', path };
  },
};
