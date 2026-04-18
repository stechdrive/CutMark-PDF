import { describe, expect, it } from 'vitest';
import {
  createAssetHintsFromCurrentDocument,
  deriveCurrentProjectName,
} from '../../application/currentDocumentProjection';

const withRelativePath = (file: File, value: string) => {
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value,
  });
  return file;
};

describe('application/currentDocumentProjection', () => {
  it('derives asset hints from PDF and image sessions', () => {
    const pdfHints = createAssetHintsFromCurrentDocument({
      docType: 'pdf',
      pdfFile: new File(['pdf'], 'board.pdf', { type: 'application/pdf' }),
      imageFiles: [],
      pageCount: 2,
    });

    expect(pdfHints).toEqual([
      { sourceKind: 'pdf-page', sourceLabel: 'board.pdf', pageNumber: 1 },
      { sourceKind: 'pdf-page', sourceLabel: 'board.pdf', pageNumber: 2 },
    ]);

    const imageHints = createAssetHintsFromCurrentDocument({
      docType: 'images',
      pdfFile: null,
      imageFiles: [
        new File(['1'], '001.png', { type: 'image/png' }),
        new File(['2'], '002.png', { type: 'image/png' }),
      ],
      pageCount: 2,
    });

    expect(imageHints).toEqual([
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    ]);
  });

  it('derives current project names from PDF and image inputs', () => {
    expect(
      deriveCurrentProjectName({
        docType: 'pdf',
        pdfFile: new File(['pdf'], 'book.pdf', { type: 'application/pdf' }),
        imageFiles: [],
      })
    ).toBe('book.pdf');

    expect(
      deriveCurrentProjectName({
        docType: 'images',
        pdfFile: null,
        imageFiles: [
          withRelativePath(
            new File(['img'], '001.png', { type: 'image/png' }),
            'shots/001.png'
          ),
        ],
      })
    ).toBe('shots');
  });
});
