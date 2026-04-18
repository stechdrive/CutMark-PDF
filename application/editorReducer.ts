import {
  createLogicalPage,
  createPageBinding,
  CutPlacement,
  EditorState,
  LogicalPage,
  LogicalPageId,
  NumberingPolicy,
  PageBindingStatus,
} from '../domain/project';
import {
  renumberLogicalPagesFromCut,
  renumberLogicalPagesFromPage,
} from '../domain/numbering';
export type EditorAction =
  | { type: 'selectLogicalPage'; logicalPageId: LogicalPageId | null }
  | { type: 'selectCut'; logicalPageId: LogicalPageId | null; cutId: string | null }
  | {
      type: 'assignAssetToLogicalPage';
      logicalPageId: LogicalPageId;
      assetId: string | null;
      status?: PageBindingStatus;
    }
  | {
      type: 'insertLogicalPageAfter';
      afterLogicalPageId: LogicalPageId | null;
      logicalPage?: LogicalPage;
    }
  | { type: 'removeLogicalPage'; logicalPageId: LogicalPageId }
  | { type: 'moveLogicalPage'; logicalPageId: LogicalPageId; toIndex: number }
  | { type: 'addCutToLogicalPage'; logicalPageId: LogicalPageId; cut: CutPlacement }
  | { type: 'updateCutPosition'; cutId: string; x: number; y: number }
  | { type: 'deleteCut'; cutId: string }
  | { type: 'setPreviewScale'; scale: number }
  | { type: 'setPreviewMode'; mode: EditorState['preview']['mode'] }
  | { type: 'updateNumberingPolicy'; numbering: Partial<NumberingPolicy> }
  | { type: 'renumberFromCut'; cutId: string; numbering: NumberingPolicy }
  | { type: 'renumberFromLogicalPage'; logicalPageId: LogicalPageId; numbering: NumberingPolicy };

const clampIndex = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const updateLogicalPages = (
  state: EditorState,
  updater: (pages: LogicalPage[]) => LogicalPage[]
): EditorState => ({
  ...state,
  project: {
    ...state.project,
    logicalPages: updater(state.project.logicalPages),
  },
});

export const editorReducer = (
  state: EditorState,
  action: EditorAction
): EditorState => {
  switch (action.type) {
    case 'selectLogicalPage':
      return {
        ...state,
        selection: {
          logicalPageId: action.logicalPageId,
          cutId: null,
        },
      };

    case 'selectCut':
      return {
        ...state,
        selection: {
          logicalPageId: action.logicalPageId,
          cutId: action.cutId,
        },
      };

    case 'assignAssetToLogicalPage':
      return {
        ...state,
        bindings: Object.fromEntries(
          Object.entries(state.bindings).map(([logicalPageId, binding]) => [
            logicalPageId,
            logicalPageId !== action.logicalPageId && action.assetId && binding.assetId === action.assetId
              ? createPageBinding(logicalPageId)
              : logicalPageId === action.logicalPageId
                ? createPageBinding(
                    action.logicalPageId,
                    action.assetId,
                    action.status ?? (action.assetId ? 'matched' : 'unbound')
                  )
                : binding,
          ])
        ),
      };

    case 'insertLogicalPageAfter': {
      const nextPage = action.logicalPage ?? createLogicalPage();
      const logicalPages = [...state.project.logicalPages];
      const afterIndex =
        action.afterLogicalPageId === null
          ? logicalPages.length - 1
          : logicalPages.findIndex((page) => page.id === action.afterLogicalPageId);
      const insertIndex = afterIndex === -1 ? logicalPages.length : afterIndex + 1;
      logicalPages.splice(insertIndex, 0, nextPage);

      return {
        ...state,
        project: {
          ...state.project,
          logicalPages,
        },
        bindings: {
          ...state.bindings,
          [nextPage.id]: createPageBinding(nextPage.id),
        },
        selection: {
          logicalPageId: nextPage.id,
          cutId: null,
        },
      };
    }

    case 'removeLogicalPage': {
      const logicalPages = state.project.logicalPages.filter(
        (page) => page.id !== action.logicalPageId
      );
      const nextBindings = { ...state.bindings };
      delete nextBindings[action.logicalPageId];

      return {
        ...state,
        project: {
          ...state.project,
          logicalPages,
        },
        bindings: nextBindings,
        selection:
          state.selection.logicalPageId === action.logicalPageId
            ? { logicalPageId: logicalPages[0]?.id ?? null, cutId: null }
            : state.selection,
      };
    }

    case 'moveLogicalPage': {
      const currentIndex = state.project.logicalPages.findIndex(
        (page) => page.id === action.logicalPageId
      );
      if (currentIndex === -1) return state;

      const logicalPages = [...state.project.logicalPages];
      const [page] = logicalPages.splice(currentIndex, 1);
      const targetIndex = clampIndex(action.toIndex, 0, logicalPages.length);
      logicalPages.splice(targetIndex, 0, page);

      return {
        ...state,
        project: {
          ...state.project,
          logicalPages,
        },
      };
    }

    case 'addCutToLogicalPage':
      return updateLogicalPages(state, (pages) =>
        pages.map((page) =>
          page.id === action.logicalPageId
            ? { ...page, cuts: [...page.cuts, action.cut] }
            : page
        )
      );

    case 'updateCutPosition':
      return updateLogicalPages(state, (pages) =>
        pages.map((page) => ({
          ...page,
          cuts: page.cuts.map((cut) =>
            cut.id === action.cutId ? { ...cut, x: action.x, y: action.y } : cut
          ),
        }))
      );

    case 'deleteCut':
      return {
        ...updateLogicalPages(state, (pages) =>
          pages.map((page) => ({
            ...page,
            cuts: page.cuts.filter((cut) => cut.id !== action.cutId),
          }))
        ),
        selection:
          state.selection.cutId === action.cutId
            ? { ...state.selection, cutId: null }
            : state.selection,
      };

    case 'setPreviewScale':
      return {
        ...state,
        preview: {
          ...state.preview,
          scale: action.scale,
        },
      };

    case 'setPreviewMode':
      return {
        ...state,
        preview: {
          ...state.preview,
          mode: action.mode,
        },
      };

    case 'updateNumberingPolicy':
      return {
        ...state,
        project: {
          ...state.project,
          numbering: {
            ...state.project.numbering,
            ...action.numbering,
          },
        },
      };

    case 'renumberFromCut': {
      const result = renumberLogicalPagesFromCut(
        state.project.logicalPages,
        action.cutId,
        action.numbering
      );

      if (!result.found) return state;

      return {
        ...state,
        project: {
          ...state.project,
          logicalPages: result.logicalPages,
          numbering: {
            ...action.numbering,
            nextNumber: result.nextNumbering.nextNumber,
            branchChar: result.nextNumbering.branchChar,
          },
        },
      };
    }

    case 'renumberFromLogicalPage': {
      const result = renumberLogicalPagesFromPage(
        state.project.logicalPages,
        action.logicalPageId,
        action.numbering
      );

      if (!result.found) return state;

      return {
        ...state,
        project: {
          ...state.project,
          logicalPages: result.logicalPages,
          numbering: {
            ...action.numbering,
            nextNumber: result.nextNumbering.nextNumber,
            branchChar: result.nextNumbering.branchChar,
          },
        },
      };
    }

    default:
      return state;
  }
};
