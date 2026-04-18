import { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { editorReducer, EditorAction } from '../application/editorReducer';
import {
  createHistoryState,
  HistoryState,
  pushHistoryState,
  redoHistory,
  undoHistory,
} from '../application/history';
import {
  countAssignedProjectAssetBindings,
  createSuggestedProjectAssetBindings,
  hasCompleteProjectAssetBindings,
  ProjectAssetBindings,
  synchronizeProjectAssetBindings,
} from '../application/projectBindings';
import { getLogicalPageIndex, getSelectedCut, getSelectedLogicalPage } from '../application/selectors';
import {
  AssetHint,
  createEditorState,
  createLogicalPage,
  createPageBinding,
  EditorState,
  LogicalPageId,
  NumberingPolicy,
  ProjectDocument,
  toNumberingPolicy,
  toStyleSettings,
  toTemplateSnapshot,
} from '../domain/project';
import { AppSettings, Template } from '../types';

const ASSET_ID_PREFIX = 'asset-';

const resolveStateAction = <T>(current: T, next: SetStateAction<T>) =>
  typeof next === 'function'
    ? (next as (value: T) => T)(current)
    : next;

const toAssetId = (assetIndex: number) => `${ASSET_ID_PREFIX}${assetIndex}`;

const toAssetIndex = (assetId: string | null | undefined) => {
  if (!assetId?.startsWith(ASSET_ID_PREFIX)) return null;
  const parsed = Number.parseInt(assetId.slice(ASSET_ID_PREFIX.length), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toEditorBindings = (
  project: ProjectDocument,
  bindings: ProjectAssetBindings
) =>
  Object.fromEntries(
    project.logicalPages.map((page) => {
      const assetIndex = bindings[page.id];
      return [
        page.id,
        createPageBinding(
          page.id,
          assetIndex != null ? toAssetId(assetIndex) : null,
          assetIndex != null ? 'matched' : 'unbound'
        ),
      ];
    })
  ) as EditorState['bindings'];

const toProjectBindings = (state: EditorState): ProjectAssetBindings =>
  Object.fromEntries(
    state.project.logicalPages.map((page) => [
      page.id,
      toAssetIndex(state.bindings[page.id]?.assetId),
    ])
  ) as ProjectAssetBindings;

const areBindingsEqual = (
  left: ProjectAssetBindings,
  right: ProjectAssetBindings
) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => left[key] === right[key]);
};

const createEditorStateFromProject = (
  project: ProjectDocument,
  currentAssets: Array<AssetHint | null | undefined>
) => {
  const bindings = createSuggestedProjectAssetBindings(project, currentAssets);
  return createEditorState(project, {
    bindings: toEditorBindings(project, bindings),
  });
};

const toAppSettings = (project: ProjectDocument): AppSettings => ({
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

const toTemplate = (project: ProjectDocument): Template => ({
  id: project.template.id,
  name: project.template.name,
  rowCount: project.template.rowCount,
  xPosition: project.template.xPosition,
  rowPositions: [...project.template.rowPositions],
});

export const useProjectEditor = (
  currentAssets: Array<AssetHint | null | undefined>
) => {
  const [history, setHistory] = useState<HistoryState<EditorState> | null>(null);
  const dragBaseRef = useRef<EditorState | null>(null);
  const previousAssetsRef = useRef(currentAssets);

  const editorState = history?.present ?? null;
  const project = editorState?.project ?? null;
  const bindings = useMemo(
    () => (editorState ? toProjectBindings(editorState) : {}),
    [editorState]
  );
  const selectedLogicalPage = editorState ? getSelectedLogicalPage(editorState) : null;
  const selectedCut = editorState ? getSelectedCut(editorState) : null;
  const selectedLogicalPageNumber = useMemo(() => {
    if (!editorState?.selection.logicalPageId) return null;
    const pageIndex = getLogicalPageIndex(editorState, editorState.selection.logicalPageId);
    return pageIndex >= 0 ? pageIndex + 1 : null;
  }, [editorState]);
  const selectedAssetIndex =
    editorState?.selection.logicalPageId != null
      ? bindings[editorState.selection.logicalPageId] ?? null
      : null;
  const canUndo = (history?.past.length ?? 0) > 0;
  const canRedo = (history?.future.length ?? 0) > 0;
  const assignedCount = project ? countAssignedProjectAssetBindings(project, bindings) : 0;
  const canApply = project ? hasCompleteProjectAssetBindings(project, bindings) : false;

  const syncBindings = useCallback((nextBindings: ProjectAssetBindings) => {
    setHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        present: {
          ...prev.present,
          bindings: toEditorBindings(prev.present.project, nextBindings),
        },
      };
    });
  }, []);

  useEffect(() => {
    const previousAssets = previousAssetsRef.current;
    previousAssetsRef.current = currentAssets;

    if (!editorState || previousAssets === currentAssets) {
      return;
    }

    const nextBindings = synchronizeProjectAssetBindings(
      editorState.project,
      currentAssets,
      bindings
    );

    if (areBindingsEqual(bindings, nextBindings)) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        syncBindings(nextBindings);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bindings, currentAssets, editorState, syncBindings]);

  const replacePresent = useCallback((updater: (state: EditorState) => EditorState) => {
    setHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        present: updater(prev.present),
      };
    });
  }, []);

  const pushPresent = useCallback((updater: (state: EditorState) => EditorState) => {
    setHistory((prev) => {
      if (!prev) return prev;
      return pushHistoryState(prev, updater(prev.present));
    });
  }, []);

  const dispatch = useCallback((
    action: EditorAction,
    options: { pushHistory?: boolean } = {}
  ) => {
    const run = options.pushHistory ? pushPresent : replacePresent;
    run((state) => editorReducer(state, action));
  }, [pushPresent, replacePresent]);

  const loadProject = useCallback((projectDocument: ProjectDocument) => {
    setHistory(createHistoryState(createEditorStateFromProject(projectDocument, currentAssets)));
    dragBaseRef.current = null;
  }, [currentAssets]);

  const replaceProject = useCallback((
    projectDocument: ProjectDocument,
    nextBindings: ProjectAssetBindings | null = null
  ) => {
    setHistory((prev) => {
      if (!prev) {
        return createHistoryState(
          createEditorState(projectDocument, {
            bindings: toEditorBindings(
              projectDocument,
              nextBindings ?? createSuggestedProjectAssetBindings(projectDocument, currentAssets)
            ),
          })
        );
      }

      return {
        ...prev,
        present: {
          ...prev.present,
          project: projectDocument,
          bindings: toEditorBindings(
            projectDocument,
            nextBindings ??
              synchronizeProjectAssetBindings(projectDocument, currentAssets, bindings)
          ),
        },
      };
    });
  }, [bindings, currentAssets]);

  const clearProject = useCallback(() => {
    setHistory(null);
    dragBaseRef.current = null;
  }, []);

  const selectLogicalPage = useCallback((logicalPageId: LogicalPageId | null) => {
    dispatch({ type: 'selectLogicalPage', logicalPageId });
  }, [dispatch]);

  const selectCut = useCallback((cutId: string | null) => {
    dispatch({
      type: 'selectCut',
      logicalPageId: editorState?.selection.logicalPageId ?? null,
      cutId,
    });
  }, [dispatch, editorState]);

  const assignAsset = useCallback((logicalPageId: LogicalPageId, assetIndex: number | null) => {
    dispatch(
      {
        type: 'assignAssetToLogicalPage',
        logicalPageId,
        assetId: assetIndex != null ? toAssetId(assetIndex) : null,
      },
      { pushHistory: true }
    );
  }, [dispatch]);

  const resetBindings = useCallback(() => {
    if (!project) return;
    const nextBindings = createSuggestedProjectAssetBindings(project, currentAssets);
    pushPresent((state) => ({
      ...state,
      bindings: toEditorBindings(state.project, nextBindings),
    }));
  }, [currentAssets, project, pushPresent]);

  const insertPageAfter = useCallback((afterLogicalPageId: LogicalPageId | null) => {
    dispatch(
      {
        type: 'insertLogicalPageAfter',
        afterLogicalPageId,
        logicalPage: createLogicalPage(),
      },
      { pushHistory: true }
    );
  }, [dispatch]);

  const removePage = useCallback((logicalPageId: LogicalPageId) => {
    dispatch({ type: 'removeLogicalPage', logicalPageId }, { pushHistory: true });
  }, [dispatch]);

  const movePage = useCallback((logicalPageId: LogicalPageId, direction: -1 | 1) => {
    if (!editorState) return;
    const currentIndex = getLogicalPageIndex(editorState, logicalPageId);
    if (currentIndex < 0) return;

    dispatch(
      {
        type: 'moveLogicalPage',
        logicalPageId,
        toIndex: currentIndex + direction,
      },
      { pushHistory: true }
    );
  }, [dispatch, editorState]);

  const addCutToSelectedPage = useCallback((
    cut: Extract<EditorAction, { type: 'addCutToLogicalPage' }>['cut']
  ) => {
    if (!editorState?.selection.logicalPageId) return;

    pushPresent((state) => {
      const nextState = editorReducer(state, {
        type: 'addCutToLogicalPage',
        logicalPageId: state.selection.logicalPageId ?? '',
        cut,
      });
      return {
        ...nextState,
        selection: {
          logicalPageId: state.selection.logicalPageId,
          cutId: cut.id,
        },
      };
    });
  }, [editorState, pushPresent]);

  const updateCutPosition = useCallback((cutId: string, x: number, y: number) => {
    setHistory((prev) => {
      if (!prev) return prev;
      if (!dragBaseRef.current) {
        dragBaseRef.current = prev.present;
      }
      return {
        ...prev,
        present: editorReducer(prev.present, {
          type: 'updateCutPosition',
          cutId,
          x,
          y,
        }),
      };
    });
  }, []);

  const commitCutDrag = useCallback(() => {
    setHistory((prev) => {
      const dragBase = dragBaseRef.current;
      dragBaseRef.current = null;
      if (!prev || !dragBase) return prev;
      return pushHistoryState(
        {
          past: prev.past,
          present: dragBase,
          future: prev.future,
        },
        prev.present
      );
    });
  }, []);

  const deleteCut = useCallback((cutId: string) => {
    dispatch({ type: 'deleteCut', cutId }, { pushHistory: true });
  }, [dispatch]);

  const renumberFromCut = useCallback((
    cutId: string,
    numbering: NumberingPolicy
  ) => {
    if (!editorState) return null;

    const nextPresent = editorReducer(editorState, {
      type: 'renumberFromCut',
      cutId,
      numbering,
    });

    setHistory((prev) => (prev ? pushHistoryState(prev, nextPresent) : prev));
    return nextPresent.project.numbering;
  }, [editorState]);

  const updateSettings = useCallback((next: SetStateAction<AppSettings>) => {
    replacePresent((state) => {
      const nextSettings = resolveStateAction(toAppSettings(state.project), next);
      return {
        ...state,
        project: {
          ...state.project,
          numbering: toNumberingPolicy(nextSettings),
          style: toStyleSettings(nextSettings),
        },
      };
    });
  }, [replacePresent]);

  const updateTemplate = useCallback((next: SetStateAction<Template>) => {
    replacePresent((state) => {
      const nextTemplate = resolveStateAction(toTemplate(state.project), next);
      return {
        ...state,
        project: {
          ...state.project,
          template: toTemplateSnapshot(nextTemplate),
        },
      };
    });
  }, [replacePresent]);

  const undo = useCallback(() => {
    setHistory((prev) => (prev ? undoHistory(prev) : prev));
    dragBaseRef.current = null;
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => (prev ? redoHistory(prev) : prev));
    dragBaseRef.current = null;
  }, []);

  return {
    editorState,
    project,
    bindings,
    selectedLogicalPage,
    selectedCut,
    selectedLogicalPageId: editorState?.selection.logicalPageId ?? null,
    selectedCutId: editorState?.selection.cutId ?? null,
    selectedLogicalPageNumber,
    selectedAssetIndex,
    canUndo,
    canRedo,
    assignedCount,
    canApply,
    loadProject,
    replaceProject,
    clearProject,
    selectLogicalPage,
    selectCut,
    assignAsset,
    resetBindings,
    insertPageAfter,
    removePage,
    movePage,
    addCutToSelectedPage,
    updateCutPosition,
    commitCutDrag,
    deleteCut,
    renumberFromCut,
    updateSettings,
    updateTemplate,
    undo,
    redo,
  };
};
