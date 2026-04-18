import { useLegacyCutEditor } from './useLegacyCutEditor';
import { useLegacyProjectProjection } from './useLegacyProjectProjection';
import { AssetHint } from '../domain/project';
import { AppSettings, DocType, NumberingState, Template } from '../types';

interface UseCurrentProjectSessionOptions {
  docType: DocType | null;
  currentPage: number;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  getNextLabel: () => string;
  getNextNumberingState: () => NumberingState;
  template: Template;
}

export const useCurrentProjectSession = ({
  docType,
  currentPage,
  numPages,
  currentAssetHints,
  currentProjectName,
  settings,
  numberingState,
  setNumberingState,
  getNextLabel,
  getNextNumberingState,
  template,
}: UseCurrentProjectSessionOptions) => {
  const cutEditor = useLegacyCutEditor({
    currentPage,
    settings,
    numberingState,
    setNumberingState,
    getNextLabel,
    getNextNumberingState,
  });

  const projectProjection = useLegacyProjectProjection({
    docType,
    cuts: cutEditor.cuts,
    settings,
    template,
    numPages,
    currentPage,
    currentAssetHints,
    currentProjectName,
  });

  return {
    ...cutEditor,
    project: projectProjection.project,
    bindings: projectProjection.bindings,
    previewLogicalPage: projectProjection.previewLogicalPage,
  };
};
