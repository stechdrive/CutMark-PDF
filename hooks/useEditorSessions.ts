import { AssetHint, ProjectDocument } from '../domain/project';
import { AppSettings, DocType, NumberingState, Template } from '../types';
import { useCurrentProjectSession } from './useCurrentProjectSession';
import { useLoadedProjectSession } from './useLoadedProjectSession';

interface UseEditorSessionsOptions {
  docType: DocType | null;
  currentPage: number;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  template: Template;
}

interface UseEditorSessionsResult {
  currentProjectSession: ReturnType<typeof useCurrentProjectSession>;
  loadedProjectSession: ReturnType<typeof useLoadedProjectSession>;
  loadedProject: ProjectDocument | null;
  isLoadedProjectActive: boolean;
}

export const useEditorSessions = ({
  docType,
  currentPage,
  numPages,
  currentAssetHints,
  currentProjectName,
  settings,
  numberingState,
  setNumberingState,
  template,
}: UseEditorSessionsOptions): UseEditorSessionsResult => {
  const currentProjectSession = useCurrentProjectSession({
    docType,
    currentPage,
    numPages,
    currentAssetHints,
    currentProjectName,
    settings,
    numberingState,
    setNumberingState,
    template,
  });

  const loadedProjectSession = useLoadedProjectSession(currentAssetHints, settings);
  const loadedProject = loadedProjectSession.project;

  return {
    currentProjectSession,
    loadedProjectSession,
    loadedProject,
    isLoadedProjectActive: !!loadedProject,
  };
};
