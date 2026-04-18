import { HistoryState } from './history';
import { createCutsFromProjectDocument, createProjectDocumentFromCuts } from './projectProjection';
import { AssetHint, LogicalPage, ProjectDocument } from '../domain/project';
import { AppSettings, Cut, DocType, NumberingState, Template } from '../types';

export interface CurrentProjectSessionPresent {
  project: ProjectDocument | null;
  selectedCutId: string | null;
}

export interface CreateCurrentProjectOptions {
  docType: DocType | null;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  template: Template;
  cuts?: Cut[];
  savedAt?: string;
}

const projectHasCut = (
  project: ProjectDocument | null,
  cutId: string | null
) => {
  if (!project || !cutId) return false;
  return project.logicalPages.some((page) =>
    page.cuts.some((cut) => cut.id === cutId)
  );
};

export const withSelectedCut = (
  project: ProjectDocument | null,
  selectedCutId: string | null
): CurrentProjectSessionPresent => ({
  project,
  selectedCutId: projectHasCut(project, selectedCutId) ? selectedCutId : null,
});

export const createCurrentProjectDocument = ({
  docType,
  numPages,
  currentAssetHints,
  currentProjectName,
  settings,
  template,
  cuts = [],
  savedAt,
}: CreateCurrentProjectOptions): ProjectDocument | null => {
  if (!docType) return null;

  return createProjectDocumentFromCuts({
    cuts,
    settings,
    template,
    pageCount: Math.max(numPages, 1),
    assetHints: currentAssetHints,
    projectName: currentProjectName,
    savedAt,
  });
};

export const syncProjectWithInputs = (
  project: ProjectDocument | null,
  options: Omit<CreateCurrentProjectOptions, 'cuts' | 'savedAt'>,
  numberingFallback: NumberingState
) => {
  if (!project) {
    return createCurrentProjectDocument({
      ...options,
      settings: {
        ...options.settings,
        nextNumber: numberingFallback.nextNumber,
        branchChar: numberingFallback.branchChar,
      },
    });
  }

  return createCurrentProjectDocument({
    ...options,
    settings: {
      ...options.settings,
      nextNumber: project.numbering.nextNumber,
      branchChar: project.numbering.branchChar,
    },
    cuts: createCutsFromProjectDocument(project),
    savedAt: project.meta.savedAt,
  });
};

export const syncCurrentProjectHistoryWithInputs = (
  history: HistoryState<CurrentProjectSessionPresent>,
  options: Omit<CreateCurrentProjectOptions, 'cuts' | 'savedAt'>,
  numberingFallback: NumberingState
): HistoryState<CurrentProjectSessionPresent> => ({
  past: history.past.map((entry) =>
    withSelectedCut(
      syncProjectWithInputs(entry.project, options, numberingFallback),
      entry.selectedCutId
    )
  ),
  present: withSelectedCut(
    syncProjectWithInputs(history.present.project, options, numberingFallback),
    history.present.selectedCutId
  ),
  future: history.future.map((entry) =>
    withSelectedCut(
      syncProjectWithInputs(entry.project, options, numberingFallback),
      entry.selectedCutId
    )
  ),
});

export const materializeCurrentProjectPresent = (
  present: CurrentProjectSessionPresent,
  options: Omit<CreateCurrentProjectOptions, 'cuts' | 'savedAt'>
): CurrentProjectSessionPresent => {
  if (present.project) {
    return present;
  }

  const project = createCurrentProjectDocument(options);
  return project ? withSelectedCut(project, present.selectedCutId) : present;
};

export const updateCurrentProjectLogicalPages = (
  project: ProjectDocument,
  updater: (logicalPages: LogicalPage[]) => LogicalPage[]
): ProjectDocument => ({
  ...project,
  logicalPages: updater(project.logicalPages),
});
