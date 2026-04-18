import { Cut } from '../types';

export const createCutsByPageIndex = (cuts: Cut[]) => {
  const cutsByPageIndex = new Map<number, Cut[]>();

  for (const cut of cuts) {
    const pageCuts = cutsByPageIndex.get(cut.pageIndex);
    if (pageCuts) {
      pageCuts.push(cut);
      continue;
    }

    cutsByPageIndex.set(cut.pageIndex, [cut]);
  }

  return cutsByPageIndex;
};
