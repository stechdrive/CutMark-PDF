import { isTauriRuntime } from '../runtime/runtimeEnvironment';
import { browserFileSave } from './browserFileSave';
import { FileSavePort, SaveBlobInput, SaveStreamInput, SaveTextInput } from './fileSavePort';
import { tauriFileSave } from './tauriFileSave';

export const getFileSavePort = (): FileSavePort =>
  isTauriRuntime() ? tauriFileSave : browserFileSave;

export const saveBlobFile = (input: SaveBlobInput) =>
  getFileSavePort().saveBlob(input);

export const saveTextFile = (input: SaveTextInput) =>
  getFileSavePort().saveText(input);

export const saveStreamFile = async (input: SaveStreamInput) => {
  const port = getFileSavePort();
  if (port.saveStream) {
    return port.saveStream(input);
  }

  const blob = await new Response(input.stream).blob();
  return port.saveBlob({ ...input, blob });
};
