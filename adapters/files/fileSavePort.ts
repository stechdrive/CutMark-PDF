export type SaveResult =
  | { status: 'saved'; path?: string }
  | { status: 'cancelled' };

export interface FileSaveInput {
  suggestedName: string;
  mimeType: string;
  extensions: string[];
  description?: string;
}

export interface SaveBlobInput extends FileSaveInput {
  blob: Blob;
}

export interface SaveTextInput extends FileSaveInput {
  text: string;
}

export interface SaveStreamInput extends FileSaveInput {
  stream: ReadableStream<Uint8Array>;
}

export interface FileSavePort {
  saveBlob(input: SaveBlobInput): Promise<SaveResult>;
  saveText(input: SaveTextInput): Promise<SaveResult>;
  saveStream?(input: SaveStreamInput): Promise<SaveResult>;
}

export const normalizeFileExtensions = (extensions: string[]) =>
  extensions
    .map((extension) => extension.trim())
    .filter(Boolean)
    .map((extension) => extension.replace(/^\./, ''));

export const normalizeBrowserAcceptExtensions = (extensions: string[]) =>
  normalizeFileExtensions(extensions).map((extension) => `.${extension}`);
