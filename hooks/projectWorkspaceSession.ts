import { ProjectAssetBindings } from '../application/projectBindings';
import { LogicalPage, ProjectDocument } from '../domain/project';

export interface ProjectWorkspaceSession {
  project: ProjectDocument | null;
  bindings: ProjectAssetBindings;
  selectedLogicalPage: LogicalPage | null;
  selectedLogicalPageId: string | null;
  selectedLogicalPageNumber: number | null;
  selectedAssetIndex: number | null;
}
