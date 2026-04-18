import { describe, expect, it } from 'vitest';
import { createCutsByPageIndex } from '../../application/cutPageIndex';

describe('createCutsByPageIndex', () => {
  it('groups cuts once by page index', () => {
    const cutsByPageIndex = createCutsByPageIndex([
      { id: 'a', pageIndex: 1, x: 0.1, y: 0.1, label: '001', isBranch: false },
      { id: 'b', pageIndex: 0, x: 0.2, y: 0.2, label: '002', isBranch: false },
      { id: 'c', pageIndex: 1, x: 0.3, y: 0.3, label: '003', isBranch: false },
    ]);

    expect(cutsByPageIndex.get(0)?.map((cut) => cut.id)).toEqual(['b']);
    expect(cutsByPageIndex.get(1)?.map((cut) => cut.id)).toEqual(['a', 'c']);
  });
});
