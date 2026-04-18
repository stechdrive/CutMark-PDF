import {
  AssetHint,
  createLogicalPage,
  createPageBinding,
  EditorState,
  LogicalPage,
  LogicalPageId,
  PageBindingStatus,
} from '../domain/project';
import { ProjectAssetBindings } from './projectBindings';

const ASSET_ID_PREFIX = 'asset-';

export type ConteOrganizerSlotStatus = 'matched' | 'needs_review' | 'unassigned';

export interface ConteOrganizerSlot {
  assetIndex: number;
  contePageNumber: number;
  asset: AssetHint | null;
  logicalPageId: LogicalPageId | null;
  logicalPageNumber: number | null;
  logicalPage: LogicalPage | null;
  expectedAsset: AssetHint | null;
  status: ConteOrganizerSlotStatus;
  cutCount: number;
  isSelected: boolean;
}

export interface UnplacedLogicalPageCard {
  logicalPageId: LogicalPageId;
  logicalPageNumber: number;
  logicalPage: LogicalPage;
  expectedAsset: AssetHint | null;
  cutCount: number;
  isSelected: boolean;
}

export interface ProjectConteOrganizerSummary {
  logicalPageCount: number;
  contePageCount: number;
  assignedCount: number;
  matchedCount: number;
  needsReviewCount: number;
  unassignedConteCount: number;
  unplacedLogicalPageCount: number;
  slots: ConteOrganizerSlot[];
  unplacedPages: UnplacedLogicalPageCard[];
}

export type ProjectBindingStatuses = Record<LogicalPageId, PageBindingStatus>;

interface OrganizerLayout {
  slots: Array<LogicalPageId | null>;
  unplacedIds: LogicalPageId[];
}

const toAssetIndex = (assetId: string | null | undefined) => {
  if (!assetId?.startsWith(ASSET_ID_PREFIX)) return null;
  const parsed = Number.parseInt(assetId.slice(ASSET_ID_PREFIX.length), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProjectBindingsFromState = (state: EditorState): ProjectAssetBindings =>
  Object.fromEntries(
    state.project.logicalPages.map((page) => [
      page.id,
      toAssetIndex(state.bindings[page.id]?.assetId),
    ])
  ) as ProjectAssetBindings;

const assetHintMatches = (
  expectedAsset: AssetHint | null | undefined,
  currentAsset: AssetHint | null | undefined
) => {
  if (!expectedAsset || !currentAsset) return false;
  if (expectedAsset.sourceKind !== currentAsset.sourceKind) return false;
  if (
    expectedAsset.sourceLabel &&
    currentAsset.sourceLabel &&
    expectedAsset.sourceLabel !== currentAsset.sourceLabel
  ) {
    return false;
  }
  if (
    expectedAsset.pageNumber != null &&
    currentAsset.pageNumber != null &&
    expectedAsset.pageNumber !== currentAsset.pageNumber
  ) {
    return false;
  }
  return true;
};

const createOrganizerLayout = (
  logicalPages: LogicalPage[],
  bindings: ProjectAssetBindings,
  assetCount: number
): OrganizerLayout => {
  const slots = Array.from({ length: assetCount }, () => null as LogicalPageId | null);
  const unplacedIds: LogicalPageId[] = [];

  logicalPages.forEach((page) => {
    const assetIndex = bindings[page.id];
    if (
      assetIndex != null &&
      assetIndex >= 0 &&
      assetIndex < assetCount &&
      slots[assetIndex] == null
    ) {
      slots[assetIndex] = page.id;
      return;
    }

    unplacedIds.push(page.id);
  });

  return {
    slots,
    unplacedIds,
  };
};

const getAutoBindingStatus = (
  page: LogicalPage,
  assetIndex: number | null,
  currentAssets: Array<AssetHint | null | undefined>
): PageBindingStatus => {
  if (assetIndex == null || assetIndex < 0 || assetIndex >= currentAssets.length) {
    return 'unbound';
  }

  return assetHintMatches(page.expectedAssetHint ?? null, currentAssets[assetIndex] ?? null)
    ? 'matched'
    : 'needs_review';
};

const removeLogicalPageFromLayout = (
  layout: OrganizerLayout,
  logicalPageId: LogicalPageId
): OrganizerLayout => {
  const slotIndex = layout.slots.indexOf(logicalPageId);
  if (slotIndex >= 0) {
    const slots = [...layout.slots];
    slots.splice(slotIndex, 1);
    slots.push(null);
    return {
      slots,
      unplacedIds: [...layout.unplacedIds],
    };
  }

  return {
    slots: [...layout.slots],
    unplacedIds: layout.unplacedIds.filter((pageId) => pageId !== logicalPageId),
  };
};

const insertLogicalPageIntoSlot = (
  layout: OrganizerLayout,
  logicalPageId: LogicalPageId,
  assetIndex: number
): OrganizerLayout => {
  if (layout.slots.length < 1) {
    return {
      slots: [],
      unplacedIds: [logicalPageId, ...layout.unplacedIds.filter((pageId) => pageId !== logicalPageId)],
    };
  }

  const removed = removeLogicalPageFromLayout(layout, logicalPageId);
  const slots = [...removed.slots];
  const unplacedIds = [...removed.unplacedIds];
  const insertIndex = Math.max(0, Math.min(assetIndex, slots.length - 1));

  slots.splice(insertIndex, 0, logicalPageId);
  const overflowId = slots.pop() ?? null;
  if (overflowId) {
    unplacedIds.unshift(overflowId);
  }

  return {
    slots,
    unplacedIds,
  };
};

const compactLayout = (layout: OrganizerLayout): OrganizerLayout => {
  const slots = [...layout.slots];
  const unplacedIds = [...layout.unplacedIds];

  for (let index = 0; index < slots.length && unplacedIds.length > 0; index += 1) {
    if (slots[index] == null) {
      slots[index] = unplacedIds.shift() ?? null;
    }
  }

  return {
    slots,
    unplacedIds,
  };
};

const applyOrganizerLayoutToState = (
  state: EditorState,
  layout: OrganizerLayout,
  currentAssets: Array<AssetHint | null | undefined>,
  options: {
    selectedLogicalPageId?: LogicalPageId | null;
    removeLogicalPageId?: LogicalPageId;
    resolvedLogicalPageIds?: Set<LogicalPageId>;
  } = {}
): EditorState => {
  const pageLookup = new Map(
    state.project.logicalPages.map((page) => [page.id, page] as const)
  );

  if (options.removeLogicalPageId) {
    pageLookup.delete(options.removeLogicalPageId);
  }

  const orderedPageIds = [
    ...layout.slots.filter((pageId): pageId is LogicalPageId => pageId != null),
    ...layout.unplacedIds,
  ].filter((pageId) => pageLookup.has(pageId));

  const logicalPages = orderedPageIds
    .map((pageId) => pageLookup.get(pageId) ?? null)
    .filter((page): page is LogicalPage => page != null);

  const bindings = Object.fromEntries(
    logicalPages.map((page) => [page.id, createPageBinding(page.id)])
  ) as EditorState['bindings'];
  const resolvedLogicalPageIds = options.resolvedLogicalPageIds ?? new Set<LogicalPageId>();

  layout.slots.forEach((pageId, assetIndex) => {
    if (!pageId || !bindings[pageId]) return;
    const page = pageLookup.get(pageId);
    if (!page) return;

    const previousBinding = state.bindings[pageId];
    const previousAssetIndex = toAssetIndex(previousBinding?.assetId);
    const status = resolvedLogicalPageIds.has(pageId)
      ? 'matched'
      : previousAssetIndex === assetIndex && previousBinding?.status && previousBinding.status !== 'unbound'
        ? previousBinding.status
        : getAutoBindingStatus(page, assetIndex, currentAssets);

    bindings[pageId] = createPageBinding(pageId, `asset-${assetIndex}`, status);
  });

  const nextSelectedLogicalPageId =
    options.selectedLogicalPageId !== undefined
      ? options.selectedLogicalPageId
      : state.selection.logicalPageId;
  const selectedLogicalPage =
    nextSelectedLogicalPageId != null
      ? logicalPages.find((page) => page.id === nextSelectedLogicalPageId) ?? null
      : null;
  const nextCutId =
    selectedLogicalPage?.cuts.some((cut) => cut.id === state.selection.cutId)
      ? state.selection.cutId
      : null;

  return {
    ...state,
    project: {
      ...state.project,
      logicalPages,
    },
    bindings,
    selection: {
      logicalPageId: selectedLogicalPage?.id ?? null,
      cutId: nextCutId,
    },
  };
};

export const createProjectConteOrganizerSummary = (
  logicalPages: LogicalPage[],
  bindings: ProjectAssetBindings,
  bindingStatuses: ProjectBindingStatuses,
  currentAssets: Array<AssetHint | null | undefined>,
  selectedLogicalPageId: LogicalPageId | null
): ProjectConteOrganizerSummary => {
  const layout = createOrganizerLayout(logicalPages, bindings, currentAssets.length);
  const logicalPageNumbers = new Map(
    logicalPages.map((page, index) => [page.id, index + 1] as const)
  );
  const pageLookup = new Map(logicalPages.map((page) => [page.id, page] as const));

  let matchedCount = 0;
  let needsReviewCount = 0;
  let unassignedConteCount = 0;

  const slots = currentAssets.map((asset, assetIndex) => {
    const logicalPageId = layout.slots[assetIndex];
    const logicalPage = logicalPageId ? pageLookup.get(logicalPageId) ?? null : null;
    const expectedAsset = logicalPage?.expectedAssetHint ?? null;
    const status: ConteOrganizerSlotStatus = !logicalPage
      ? 'unassigned'
      : bindingStatuses[logicalPage.id] === 'needs_review'
        ? 'needs_review'
        : 'matched';

    if (status === 'matched') matchedCount += 1;
    if (status === 'needs_review') needsReviewCount += 1;
    if (status === 'unassigned') unassignedConteCount += 1;

    return {
      assetIndex,
      contePageNumber: assetIndex + 1,
      asset: asset ?? null,
      logicalPageId: logicalPage?.id ?? null,
      logicalPageNumber: logicalPage ? logicalPageNumbers.get(logicalPage.id) ?? null : null,
      logicalPage,
      expectedAsset,
      status,
      cutCount: logicalPage?.cuts.length ?? 0,
      isSelected: logicalPage?.id === selectedLogicalPageId,
    };
  });

  const unplacedPages = layout.unplacedIds
    .map((pageId) => pageLookup.get(pageId) ?? null)
    .filter((page): page is LogicalPage => page != null)
    .map((page) => ({
      logicalPageId: page.id,
      logicalPageNumber: logicalPageNumbers.get(page.id) ?? 0,
      logicalPage: page,
      expectedAsset: page.expectedAssetHint ?? null,
      cutCount: page.cuts.length,
      isSelected: page.id === selectedLogicalPageId,
    }));

  return {
    logicalPageCount: logicalPages.length,
    contePageCount: currentAssets.length,
    assignedCount: slots.filter((slot) => slot.logicalPageId != null).length,
    matchedCount,
    needsReviewCount,
    unassignedConteCount,
    unplacedLogicalPageCount: unplacedPages.length,
    slots,
    unplacedPages,
  };
};

export const insertBlankLogicalPageAtConte = (
  state: EditorState,
  currentAssets: Array<AssetHint | null | undefined>,
  assetIndex: number,
  logicalPage: LogicalPage = createLogicalPage()
): EditorState => {
  const projectWithInsertedPage = {
    ...state.project,
    logicalPages: [...state.project.logicalPages, logicalPage],
  };
  const layout = createOrganizerLayout(
    state.project.logicalPages,
    getProjectBindingsFromState(state),
    currentAssets.length
  );
  const insertedLayout = insertLogicalPageIntoSlot(layout, logicalPage.id, assetIndex);

  return applyOrganizerLayoutToState(
    {
      ...state,
      project: projectWithInsertedPage,
    },
    insertedLayout,
    currentAssets,
    {
      selectedLogicalPageId: logicalPage.id,
      resolvedLogicalPageIds: new Set([logicalPage.id]),
    }
  );
};

export const removeLogicalPageFromConte = (
  state: EditorState,
  currentAssets: Array<AssetHint | null | undefined>,
  logicalPageId: LogicalPageId
): EditorState => {
  const layout = createOrganizerLayout(
    state.project.logicalPages,
    getProjectBindingsFromState(state),
    currentAssets.length
  );
  const nextLayout = compactLayout(removeLogicalPageFromLayout(layout, logicalPageId));

  return applyOrganizerLayoutToState(state, nextLayout, currentAssets, {
    removeLogicalPageId: logicalPageId,
    selectedLogicalPageId:
      state.selection.logicalPageId === logicalPageId
        ? null
        : state.selection.logicalPageId,
  });
};

export const moveLogicalPageToConte = (
  state: EditorState,
  currentAssets: Array<AssetHint | null | undefined>,
  logicalPageId: LogicalPageId,
  targetAssetIndex: number
): EditorState => {
  const layout = createOrganizerLayout(
    state.project.logicalPages,
    getProjectBindingsFromState(state),
    currentAssets.length
  );
  const nextLayout = insertLogicalPageIntoSlot(layout, logicalPageId, targetAssetIndex);

  return applyOrganizerLayoutToState(state, nextLayout, currentAssets, {
    selectedLogicalPageId: logicalPageId,
    resolvedLogicalPageIds: new Set([logicalPageId]),
  });
};
