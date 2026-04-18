import { AssetSession, EditorState, LogicalPage, LogicalPageId, PageBinding } from '../domain/project';

export const getLogicalPageIndex = (
  state: EditorState,
  logicalPageId: LogicalPageId
) => state.project.logicalPages.findIndex((page) => page.id === logicalPageId);

export const getLogicalPageById = (
  state: EditorState,
  logicalPageId: LogicalPageId | null | undefined
): LogicalPage | null => {
  if (!logicalPageId) return null;
  return state.project.logicalPages.find((page) => page.id === logicalPageId) ?? null;
};

export const getSelectedLogicalPage = (state: EditorState) =>
  getLogicalPageById(state, state.selection.logicalPageId);

export const getSelectedCut = (state: EditorState) => {
  const page = getSelectedLogicalPage(state);
  if (!page || !state.selection.cutId) return null;
  return page.cuts.find((cut) => cut.id === state.selection.cutId) ?? null;
};

export const getBindingByLogicalPageId = (
  state: EditorState,
  logicalPageId: LogicalPageId | null | undefined
): PageBinding | null => {
  if (!logicalPageId) return null;
  return state.bindings[logicalPageId] ?? null;
};

export const getSelectedBinding = (state: EditorState) =>
  getBindingByLogicalPageId(state, state.selection.logicalPageId);

export const getAssetById = (
  assetSession: AssetSession | null | undefined,
  assetId: string | null | undefined
) => {
  if (!assetSession || !assetId) return null;
  return assetSession.assets.find((asset) => asset.id === assetId) ?? null;
};

export const getBoundAssetForLogicalPage = (
  state: EditorState,
  assetSession: AssetSession | null | undefined,
  logicalPageId: LogicalPageId | null | undefined
) => {
  const binding = getBindingByLogicalPageId(state, logicalPageId);
  return binding ? getAssetById(assetSession, binding.assetId) : null;
};

export const getSelectedBoundAsset = (
  state: EditorState,
  assetSession: AssetSession | null | undefined
) => getBoundAssetForLogicalPage(state, assetSession, state.selection.logicalPageId);

export const getUnresolvedBindings = (state: EditorState) =>
  Object.values(state.bindings).filter((binding) => binding.status !== 'matched');

export const countUnresolvedBindings = (state: EditorState) =>
  getUnresolvedBindings(state).length;

export const getUnboundLogicalPages = (state: EditorState) =>
  state.project.logicalPages.filter((page) => state.bindings[page.id]?.assetId == null);

export const canExportBoundProject = (
  state: EditorState,
  assetSession: AssetSession | null | undefined
) => {
  if (!assetSession) return false;

  return state.project.logicalPages.every((page) => {
    const binding = state.bindings[page.id];
    if (!binding || binding.status !== 'matched' || !binding.assetId) {
      return false;
    }
    return !!getAssetById(assetSession, binding.assetId);
  });
};
