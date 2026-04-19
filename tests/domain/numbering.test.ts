import { describe, expect, it } from 'vitest';
import { createCut } from '../../test/factories';
import {
  createLogicalPage,
  NumberingPolicy,
} from '../../domain/project';
import {
  advanceNumberingState,
  buildNumberLabel,
  isSameNumberingState,
  renumberFlatCuts,
  renumberLogicalPagesFromCut,
  renumberLogicalPagesFromPage,
} from '../../domain/numbering';

const policy: NumberingPolicy = {
  nextNumber: 10,
  branchChar: null,
  autoIncrement: true,
  minDigits: 3,
};

describe('domain/numbering', () => {
  it('builds labels and advances numbering for normal and branch modes', () => {
    expect(buildNumberLabel({ nextNumber: 7, branchChar: null }, 4)).toBe('0007');
    expect(buildNumberLabel({ nextNumber: 7, branchChar: 'A' }, 4)).toBe('0007\nA');

    expect(advanceNumberingState({ nextNumber: 7, branchChar: null }, true)).toEqual({
      nextNumber: 8,
      branchChar: null,
    });
    expect(advanceNumberingState({ nextNumber: 7, branchChar: 'A' }, true)).toEqual({
      nextNumber: 7,
      branchChar: 'B',
    });
    expect(isSameNumberingState(
      { nextNumber: 7, branchChar: 'B' },
      { nextNumber: 7, branchChar: 'B' }
    )).toBe(true);
  });

  it('renumbers flat cuts in page and coordinate order', () => {
    const result = renumberFlatCuts(
      [
        createCut({ id: 'p1', pageIndex: 1, x: 0.1, y: 0.1, label: 'old-3' }),
        createCut({ id: 'p0b', pageIndex: 0, x: 0.9, y: 0.1, label: 'old-2' }),
        createCut({ id: 'p0a', pageIndex: 0, x: 0.2, y: 0.1, label: 'old-1' }),
      ],
      'p0b',
      { nextNumber: 10, branchChar: null },
      3,
      true
    );

    const labelMap = new Map(result.cuts.map((cut) => [cut.id, cut.label]));
    expect(labelMap.get('p0a')).toBe('old-1');
    expect(labelMap.get('p0b')).toBe('010');
    expect(labelMap.get('p1')).toBe('011');
    expect(result.nextNumbering).toEqual({ nextNumber: 12, branchChar: null });
  });

  it('renumbers logical pages from a selected cut across page order', () => {
    const result = renumberLogicalPagesFromCut(
      [
        createLogicalPage({
          id: 'lp-1',
          cuts: [
            { id: 'a', x: 0.2, y: 0.3, label: 'old-a', isBranch: false },
            { id: 'b', x: 0.4, y: 0.1, label: 'old-b', isBranch: false },
          ],
        }),
        createLogicalPage({
          id: 'lp-2',
          cuts: [{ id: 'c', x: 0.1, y: 0.2, label: 'old-c', isBranch: false }],
        }),
      ],
      'a',
      policy
    );

    expect(result.found).toBe(true);
    const labelMap = new Map(
      result.logicalPages.flatMap((page) => page.cuts.map((cut) => [cut.id, cut.label]))
    );
    expect(labelMap.get('b')).toBe('old-b');
    expect(labelMap.get('a')).toBe('010');
    expect(labelMap.get('c')).toBe('011');
    expect(result.nextNumbering).toEqual({ nextNumber: 12, branchChar: null });
  });

  it('renumbers within a page by the current cut-number order instead of Y position', () => {
    const result = renumberLogicalPagesFromCut(
      [
        createLogicalPage({
          id: 'lp-1',
          cuts: [
            { id: 'cut-10', x: 0.2, y: 0.8, label: '010', isBranch: false },
            { id: 'cut-11', x: 0.1, y: 0.1, label: '011', isBranch: false },
            { id: 'cut-10a', x: 0.3, y: 0.5, label: '010\nA', isBranch: true },
          ],
        }),
        createLogicalPage({
          id: 'lp-2',
          cuts: [{ id: 'cut-12', x: 0.1, y: 0.2, label: '012', isBranch: false }],
        }),
      ],
      'cut-10',
      {
        nextNumber: 20,
        branchChar: null,
        autoIncrement: true,
        minDigits: 3,
      }
    );

    expect(result.found).toBe(true);
    const labelMap = new Map(
      result.logicalPages.flatMap((page) => page.cuts.map((cut) => [cut.id, cut.label]))
    );
    expect(labelMap.get('cut-10')).toBe('020');
    expect(labelMap.get('cut-10a')).toBe('021');
    expect(labelMap.get('cut-11')).toBe('022');
    expect(labelMap.get('cut-12')).toBe('023');
    expect(result.nextNumbering).toEqual({ nextNumber: 24, branchChar: null });
  });

  it('renumbers from a logical page boundary and ignores earlier pages', () => {
    const result = renumberLogicalPagesFromPage(
      [
        createLogicalPage({
          id: 'lp-1',
          cuts: [{ id: 'a', x: 0.1, y: 0.1, label: 'keep', isBranch: false }],
        }),
        createLogicalPage({
          id: 'lp-2',
          cuts: [
            { id: 'b', x: 0.1, y: 0.1, label: 'old-b', isBranch: false },
            { id: 'c', x: 0.2, y: 0.2, label: 'old-c', isBranch: false },
          ],
        }),
      ],
      'lp-2',
      {
        nextNumber: 20,
        branchChar: 'A',
        autoIncrement: true,
        minDigits: 4,
      }
    );

    expect(result.logicalPages[0].cuts[0].label).toBe('keep');
    expect(result.logicalPages[1].cuts[0].label).toBe('0020\nA');
    expect(result.logicalPages[1].cuts[1].label).toBe('0020\nB');
    expect(result.nextNumbering).toEqual({
      nextNumber: 20,
      branchChar: 'C',
    });
  });
});
