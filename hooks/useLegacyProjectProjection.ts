import { useMemo } from 'react';
import { createProjectDocumentFromLegacySnapshot } from '../adapters/legacyProjectAdapter';
import { createSequentialProjectAssetBindings } from '../application/projectBindings';
import { AssetHint, ProjectDocument } from '../domain/project';
import { AppSettings, Cut, DocType, Template } from '../types';

interface UseLegacyProjectProjectionOptions {
  docType: DocType | null;
  cuts: Cut[];
  settings: AppSettings;
  template: Template;
  numPages: number;
  currentPage: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
}

export const useLegacyProjectProjection = ({
  docType,
  cuts,
  settings,
  template,
  numPages,
  currentPage,
  currentAssetHints,
  currentProjectName,
}: UseLegacyProjectProjectionOptions) => {
  const project = useMemo<ProjectDocument | null>(() => {
    if (!docType) return null;

    return createProjectDocumentFromLegacySnapshot({
      cuts,
      settings,
      template,
      pageCount: Math.max(numPages, 1),
      assetHints: currentAssetHints,
      projectName: currentProjectName,
    });
  }, [currentAssetHints, currentProjectName, cuts, docType, numPages, settings, template]);

  const bindings = useMemo(
    () =>
      project
        ? createSequentialProjectAssetBindings(project, currentAssetHints.length)
        : {},
    [currentAssetHints.length, project]
  );

  const previewLogicalPage = useMemo(
    () => project?.logicalPages[currentPage - 1] ?? null,
    [currentPage, project]
  );

  return {
    project,
    bindings,
    previewLogicalPage,
  };
};
