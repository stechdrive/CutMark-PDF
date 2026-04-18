import { createLogicalPage, LogicalPage, LogicalPageId, ProjectDocument } from '../domain/project';

const cloneLogicalPage = (page: LogicalPage): LogicalPage => ({
  ...page,
  cuts: page.cuts.map((cut) => ({ ...cut })),
  expectedAssetHint: page.expectedAssetHint ? { ...page.expectedAssetHint } : page.expectedAssetHint ?? null,
});

const cloneProject = (project: ProjectDocument): ProjectDocument => ({
  ...project,
  meta: { ...project.meta },
  numbering: { ...project.numbering },
  style: { ...project.style },
  template: {
    ...project.template,
    rowPositions: [...project.template.rowPositions],
  },
  logicalPages: project.logicalPages.map(cloneLogicalPage),
});

export const insertLogicalPageAfter = (
  project: ProjectDocument,
  afterLogicalPageId: LogicalPageId | null,
  nextPage: LogicalPage = createLogicalPage()
) => {
  const nextProject = cloneProject(project);
  const insertIndex =
    afterLogicalPageId === null
      ? nextProject.logicalPages.length
      : (() => {
          const foundIndex = nextProject.logicalPages.findIndex(
            (page) => page.id === afterLogicalPageId
          );
          return foundIndex >= 0 ? foundIndex + 1 : nextProject.logicalPages.length;
        })();

  nextProject.logicalPages.splice(insertIndex, 0, cloneLogicalPage(nextPage));
  return nextProject;
};

export const removeLogicalPage = (
  project: ProjectDocument,
  logicalPageId: LogicalPageId
) => {
  if (project.logicalPages.length <= 1) {
    return cloneProject(project);
  }

  const nextProject = cloneProject(project);
  nextProject.logicalPages = nextProject.logicalPages.filter(
    (page) => page.id !== logicalPageId
  );
  return nextProject;
};

export const moveLogicalPage = (
  project: ProjectDocument,
  logicalPageId: LogicalPageId,
  offset: -1 | 1
) => {
  const nextProject = cloneProject(project);
  const currentIndex = nextProject.logicalPages.findIndex(
    (page) => page.id === logicalPageId
  );
  if (currentIndex < 0) return nextProject;

  const targetIndex = currentIndex + offset;
  if (targetIndex < 0 || targetIndex >= nextProject.logicalPages.length) {
    return nextProject;
  }

  const [page] = nextProject.logicalPages.splice(currentIndex, 1);
  nextProject.logicalPages.splice(targetIndex, 0, page);
  return nextProject;
};
