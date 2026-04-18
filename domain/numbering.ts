import { Cut, NumberingState } from '../types';
import { CutPlacement, LogicalPage, LogicalPageId, NumberingPolicy } from './project';

const sortWithinPage = <T extends { x: number; y: number; id: string }>(a: T, b: T) => {
  if (a.y !== b.y) return a.y - b.y;
  if (a.x !== b.x) return a.x - b.x;
  return a.id.localeCompare(b.id);
};

export const formatNumberLabel = (number: number, minDigits: number) =>
  number.toString().padStart(minDigits, '0');

export const buildNumberLabel = (
  numbering: NumberingState,
  minDigits: number
) => {
  const numStr = formatNumberLabel(numbering.nextNumber, minDigits);
  return numbering.branchChar ? `${numStr}\n${numbering.branchChar}` : numStr;
};

export const advanceNumberingState = (
  numbering: NumberingState,
  autoIncrement: boolean
): NumberingState => {
  if (!autoIncrement) return { ...numbering };

  if (numbering.branchChar) {
    return {
      nextNumber: numbering.nextNumber,
      branchChar: String.fromCharCode(numbering.branchChar.charCodeAt(0) + 1),
    };
  }

  return {
    nextNumber: numbering.nextNumber + 1,
    branchChar: null,
  };
};

export const isSameNumberingState = (
  left: NumberingState,
  right: NumberingState
) =>
  left.nextNumber === right.nextNumber &&
  left.branchChar === right.branchChar;

export const sortLegacyCutsForRenumber = (a: Cut, b: Cut) => {
  if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
  return sortWithinPage(a, b);
};

export const renumberLegacyCuts = (
  cuts: Cut[],
  startCutId: string,
  startNumbering: NumberingState,
  minDigits: number,
  autoIncrement: boolean
): { cuts: Cut[]; nextNumbering: NumberingState; found: boolean } => {
  const sortedCuts = [...cuts].sort(sortLegacyCutsForRenumber);
  const startIndex = sortedCuts.findIndex((cut) => cut.id === startCutId);

  if (startIndex === -1) {
    return {
      cuts,
      nextNumbering: startNumbering,
      found: false,
    };
  }

  const updates = new Map<string, { label: string; isBranch: boolean }>();
  let currentNumbering = { ...startNumbering };

  for (let i = startIndex; i < sortedCuts.length; i++) {
    const cut = sortedCuts[i];
    updates.set(cut.id, {
      label: buildNumberLabel(currentNumbering, minDigits),
      isBranch: !!currentNumbering.branchChar,
    });
    currentNumbering = advanceNumberingState(currentNumbering, autoIncrement);
  }

  return {
    cuts: cuts.map((cut) => {
      const update = updates.get(cut.id);
      return update
        ? { ...cut, label: update.label, isBranch: update.isBranch }
        : cut;
    }),
    nextNumbering: currentNumbering,
    found: true,
  };
};

const flattenLogicalPageCuts = (logicalPages: LogicalPage[]) =>
  logicalPages.flatMap((page) =>
    [...page.cuts]
      .sort(sortWithinPage)
      .map((cut) => ({ logicalPageId: page.id, cut }))
  );

const applyLogicalPageCutUpdates = (
  logicalPages: LogicalPage[],
  updates: Map<string, { label: string; isBranch: boolean }>
) =>
  logicalPages.map((page) => ({
    ...page,
    cuts: page.cuts.map((cut) => {
      const update = updates.get(cut.id);
      return update
        ? { ...cut, label: update.label, isBranch: update.isBranch }
        : cut;
    }),
  }));

export const renumberLogicalPagesFromCut = (
  logicalPages: LogicalPage[],
  startCutId: string,
  policy: NumberingPolicy
): { logicalPages: LogicalPage[]; nextNumbering: NumberingState; found: boolean } => {
  const orderedCuts = flattenLogicalPageCuts(logicalPages);
  const startIndex = orderedCuts.findIndex((entry) => entry.cut.id === startCutId);

  if (startIndex === -1) {
    return {
      logicalPages,
      nextNumbering: {
        nextNumber: policy.nextNumber,
        branchChar: policy.branchChar,
      },
      found: false,
    };
  }

  const updates = new Map<string, { label: string; isBranch: boolean }>();
  let currentNumbering: NumberingState = {
    nextNumber: policy.nextNumber,
    branchChar: policy.branchChar,
  };

  for (let i = startIndex; i < orderedCuts.length; i++) {
    const cut = orderedCuts[i].cut;
    updates.set(cut.id, {
      label: buildNumberLabel(currentNumbering, policy.minDigits),
      isBranch: !!currentNumbering.branchChar,
    });
    currentNumbering = advanceNumberingState(currentNumbering, policy.autoIncrement);
  }

  return {
    logicalPages: applyLogicalPageCutUpdates(logicalPages, updates),
    nextNumbering: currentNumbering,
    found: true,
  };
};

export const renumberLogicalPagesFromPage = (
  logicalPages: LogicalPage[],
  startLogicalPageId: LogicalPageId,
  policy: NumberingPolicy
): { logicalPages: LogicalPage[]; nextNumbering: NumberingState; found: boolean } => {
  const startIndex = logicalPages.findIndex((page) => page.id === startLogicalPageId);

  if (startIndex === -1) {
    return {
      logicalPages,
      nextNumbering: {
        nextNumber: policy.nextNumber,
        branchChar: policy.branchChar,
      },
      found: false,
    };
  }

  const updates = new Map<string, { label: string; isBranch: boolean }>();
  let currentNumbering: NumberingState = {
    nextNumber: policy.nextNumber,
    branchChar: policy.branchChar,
  };

  for (let pageIndex = startIndex; pageIndex < logicalPages.length; pageIndex++) {
    const page = logicalPages[pageIndex];
    const orderedCuts = [...page.cuts].sort(sortWithinPage);

    for (const cut of orderedCuts) {
      updates.set(cut.id, {
        label: buildNumberLabel(currentNumbering, policy.minDigits),
        isBranch: !!currentNumbering.branchChar,
      });
      currentNumbering = advanceNumberingState(currentNumbering, policy.autoIncrement);
    }
  }

  return {
    logicalPages: applyLogicalPageCutUpdates(logicalPages, updates),
    nextNumbering: currentNumbering,
    found: true,
  };
};

export const sortCutPlacementsWithinPage = (
  cuts: CutPlacement[]
) => [...cuts].sort(sortWithinPage);
