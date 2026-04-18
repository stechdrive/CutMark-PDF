import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCurrentDocumentMetadata } from '../../hooks/useCurrentDocumentMetadata';

const withRelativePath = (file: File, value: string) => {
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value,
  });
  return file;
};

describe('useCurrentDocumentMetadata', () => {
  it('derives asset hints and project name for a PDF document', () => {
    const pdfFile = new File(['pdf'], 'book.pdf', { type: 'application/pdf' });

    const { result } = renderHook(() =>
      useCurrentDocumentMetadata({
        docType: 'pdf',
        pdfFile,
        imageFiles: [],
        numPages: 2,
      })
    );

    expect(result.current.currentProjectName).toBe('book');
    expect(result.current.currentAssetHints).toEqual([
      { sourceKind: 'pdf-page', sourceLabel: 'book.pdf', pageNumber: 1 },
      { sourceKind: 'pdf-page', sourceLabel: 'book.pdf', pageNumber: 2 },
    ]);
  });

  it('derives folder-based project name for image documents', () => {
    const imageFile = withRelativePath(
      new File(['img'], '001.png', { type: 'image/png' }),
      'shots/001.png'
    );

    const { result } = renderHook(() =>
      useCurrentDocumentMetadata({
        docType: 'images',
        pdfFile: null,
        imageFiles: [imageFile],
        numPages: 0,
      })
    );

    expect(result.current.currentProjectName).toBe('shots');
    expect(result.current.currentAssetHints).toEqual([
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
    ]);
  });

  it('returns no hints for an empty workspace', () => {
    const { result } = renderHook(() =>
      useCurrentDocumentMetadata({
        docType: null,
        pdfFile: null,
        imageFiles: [],
        numPages: 0,
      })
    );

    expect(result.current.currentProjectName).toBeUndefined();
    expect(result.current.currentAssetHints).toEqual([]);
  });
});
