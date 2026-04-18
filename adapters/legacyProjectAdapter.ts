import { AppSettings, Cut, Template } from '../types';
import { AssetHint, ProjectDocument } from '../domain/project';
import {
  createCutsFromProjectDocument,
  createProjectDocumentFromCuts,
} from '../application/projectProjection';

interface LegacySnapshotOptions {
  cuts: Cut[];
  settings: AppSettings;
  template: Template;
  pageCount?: number;
  assetHints?: Array<AssetHint | null | undefined>;
  projectName?: string;
  savedAt?: string;
}

export const createProjectDocumentFromLegacySnapshot = ({
  cuts,
  settings,
  template,
  pageCount,
  assetHints = [],
  projectName,
  savedAt,
}: LegacySnapshotOptions): ProjectDocument =>
  createProjectDocumentFromCuts({
    cuts,
    settings,
    template,
    pageCount,
    assetHints,
    projectName,
    savedAt,
  });

export const createLegacyCutsFromProjectDocument = createCutsFromProjectDocument;

export const createAppSettingsFromProjectDocument = (
  project: ProjectDocument
): AppSettings => ({
  fontSize: project.style.fontSize,
  useWhiteBackground: project.style.useWhiteBackground,
  backgroundPadding: project.style.backgroundPadding,
  nextNumber: project.numbering.nextNumber,
  branchChar: project.numbering.branchChar,
  autoIncrement: project.numbering.autoIncrement,
  minDigits: project.numbering.minDigits,
  textOutlineWidth: project.style.textOutlineWidth,
  enableClickSnapToRows: project.style.enableClickSnapToRows,
});

export const createTemplateFromProjectDocument = (
  project: ProjectDocument
): Template => ({
  id: project.template.id,
  name: project.template.name,
  rowCount: project.template.rowCount,
  xPosition: project.template.xPosition,
  rowPositions: [...project.template.rowPositions],
});
