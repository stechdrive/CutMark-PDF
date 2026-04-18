import { AppSettings, Cut, Template } from '../types';
import { AssetHint, ProjectDocument } from '../domain/project';
import {
  createCutsFromProjectDocument,
  createProjectDocumentFromCuts,
} from '../application/projectProjection';
import {
  createAppSettingsFromProjectDocument,
  createTemplateFromProjectDocument,
} from '../application/projectPresentation';

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
export {
  createAppSettingsFromProjectDocument,
  createTemplateFromProjectDocument,
};
