import { AppSettings, NumberingState, Template } from '../types';

export type ProjectVersion = 1;
export type LogicalPageId = string;
export type AssetId = string;
export type CutPlacementId = string;

export interface AssetHint {
  sourceKind: 'pdf-page' | 'image';
  sourceLabel: string;
  pageNumber?: number;
  width?: number;
  height?: number;
  fingerprint?: string;
}

export interface CutPlacement {
  id: CutPlacementId;
  x: number;
  y: number;
  label: string;
  isBranch: boolean;
}

export interface LogicalPage {
  id: LogicalPageId;
  cuts: CutPlacement[];
  expectedAssetHint?: AssetHint | null;
  note?: string;
}

export interface NumberingPolicy extends NumberingState {
  autoIncrement: boolean;
  minDigits: number;
}

export interface StyleSettings {
  fontSize: number;
  useWhiteBackground: boolean;
  backgroundPadding: number;
  textOutlineWidth: number;
  enableClickSnapToRows: boolean;
}

export type TemplateSnapshot = Pick<
  Template,
  'id' | 'name' | 'rowCount' | 'xPosition' | 'rowPositions'
>;

export interface ProjectDocument {
  version: ProjectVersion;
  meta: {
    name: string;
    savedAt: string;
  };
  logicalPages: LogicalPage[];
  numbering: NumberingPolicy;
  style: StyleSettings;
  template: TemplateSnapshot;
}

export interface AssetPage {
  id: AssetId;
  sourceKind: 'pdf-page' | 'image';
  sourceLabel: string;
  pageNumber?: number;
  width: number;
  height: number;
  fingerprint?: string;
}

export interface AssetSession {
  batchId: string;
  assets: AssetPage[];
}

export type PageBindingStatus = 'matched' | 'needs_review' | 'unbound';

export interface PageBinding {
  logicalPageId: LogicalPageId;
  assetId: AssetId | null;
  status: PageBindingStatus;
}

export interface EditorSelection {
  logicalPageId: LogicalPageId | null;
  cutId: CutPlacementId | null;
}

export interface EditorPreviewState {
  scale: number;
  mode: 'edit' | 'template';
}

export interface EditorState {
  project: ProjectDocument;
  bindings: Record<LogicalPageId, PageBinding>;
  selection: EditorSelection;
  preview: EditorPreviewState;
}

const cloneCutPlacement = (cut: CutPlacement): CutPlacement => ({
  ...cut,
});

const cloneLogicalPage = (page: LogicalPage): LogicalPage => ({
  ...page,
  cuts: page.cuts.map(cloneCutPlacement),
  expectedAssetHint: page.expectedAssetHint ? { ...page.expectedAssetHint } : page.expectedAssetHint ?? null,
});

const cloneProjectDocument = (project: ProjectDocument): ProjectDocument => ({
  ...project,
  meta: { ...project.meta },
  logicalPages: project.logicalPages.map(cloneLogicalPage),
  numbering: { ...project.numbering },
  style: { ...project.style },
  template: {
    ...project.template,
    rowPositions: [...project.template.rowPositions],
  },
});

export const toNumberingPolicy = (settings: AppSettings): NumberingPolicy => ({
  nextNumber: settings.nextNumber,
  branchChar: settings.branchChar,
  autoIncrement: settings.autoIncrement,
  minDigits: settings.minDigits,
});

export const toStyleSettings = (settings: AppSettings): StyleSettings => ({
  fontSize: settings.fontSize,
  useWhiteBackground: settings.useWhiteBackground,
  backgroundPadding: settings.backgroundPadding,
  textOutlineWidth: settings.textOutlineWidth,
  enableClickSnapToRows: settings.enableClickSnapToRows,
});

export const toTemplateSnapshot = (template: Template): TemplateSnapshot => ({
  id: template.id,
  name: template.name,
  rowCount: template.rowCount,
  xPosition: template.xPosition,
  rowPositions: [...template.rowPositions],
});

export const createLogicalPage = (
  overrides: Partial<LogicalPage> = {}
): LogicalPage => ({
  id: overrides.id ?? crypto.randomUUID(),
  cuts: overrides.cuts ? overrides.cuts.map(cloneCutPlacement) : [],
  expectedAssetHint: overrides.expectedAssetHint ?? null,
  note: overrides.note,
});

export const createPageBinding = (
  logicalPageId: LogicalPageId,
  assetId: AssetId | null = null,
  status: PageBindingStatus = assetId ? 'matched' : 'unbound'
): PageBinding => ({
  logicalPageId,
  assetId,
  status,
});

interface CreateProjectDocumentOptions {
  settings: AppSettings;
  template: Template;
  name?: string;
  savedAt?: string;
  logicalPages?: LogicalPage[];
}

export const createProjectDocument = ({
  settings,
  template,
  name = 'Untitled Project',
  savedAt = new Date().toISOString(),
  logicalPages = [createLogicalPage()],
}: CreateProjectDocumentOptions): ProjectDocument => ({
  version: 1,
  meta: {
    name,
    savedAt,
  },
  logicalPages: logicalPages.map(cloneLogicalPage),
  numbering: toNumberingPolicy(settings),
  style: toStyleSettings(settings),
  template: toTemplateSnapshot(template),
});

interface CreateEditorStateOptions {
  preview?: Partial<EditorPreviewState>;
  selection?: Partial<EditorSelection>;
  bindings?: Record<LogicalPageId, PageBinding>;
}

export const createEditorState = (
  project: ProjectDocument,
  options: CreateEditorStateOptions = {}
): EditorState => {
  const clonedProject = cloneProjectDocument(project);
  const defaultBindings = Object.fromEntries(
    clonedProject.logicalPages.map((page) => [
      page.id,
      createPageBinding(page.id),
    ])
  ) as Record<LogicalPageId, PageBinding>;

  return {
    project: clonedProject,
    bindings: options.bindings ?? defaultBindings,
    selection: {
      logicalPageId: options.selection?.logicalPageId ?? clonedProject.logicalPages[0]?.id ?? null,
      cutId: options.selection?.cutId ?? null,
    },
    preview: {
      scale: options.preview?.scale ?? 1,
      mode: options.preview?.mode ?? 'edit',
    },
  };
};
