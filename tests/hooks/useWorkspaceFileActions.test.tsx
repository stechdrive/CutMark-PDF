import type { ChangeEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceFileActions, filterRootImageFiles } from '../../hooks/useWorkspaceFileActions';
import { createAppSettings } from '../../test/factories';

const pdfServiceMocks = vi.hoisted(() => ({
  saveMarkedPdf: vi.fn(),
  saveImagesAsPdf: vi.fn(),
}));

const imageExportServiceMocks = vi.hoisted(() => ({
  exportImagesAsZip: vi.fn(),
}));

vi.mock('../../services/pdfService', () => ({
  saveMarkedPdf: pdfServiceMocks.saveMarkedPdf,
  saveImagesAsPdf: pdfServiceMocks.saveImagesAsPdf,
}));

vi.mock('../../services/imageExportService', () => ({
  exportImagesAsZip: imageExportServiceMocks.exportImagesAsZip,
}));

const setWebkitRelativePath = (file: File, value: string) => {
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value,
  });
  return file;
};

const createFileList = (files: File[]) =>
  ({
    ...files,
    length: files.length,
    item: (index: number) => files[index] ?? null,
  }) as unknown as FileList;

const createOptions = () => ({
  docType: 'images' as const,
  pdfFile: null,
  imageFiles: [] as File[],
  effectiveExportCuts: [],
  effectiveExportSettings: createAppSettings(),
  isLoadedProjectActive: false,
  canApplyLoadedProject: true,
  loadPdf: vi.fn(),
  loadImages: vi.fn(),
  onDrop: vi.fn(),
  logDebug: vi.fn(),
});

describe('useWorkspaceFileActions', () => {
  beforeEach(() => {
    pdfServiceMocks.saveMarkedPdf.mockReset();
    pdfServiceMocks.saveImagesAsPdf.mockReset();
    imageExportServiceMocks.exportImagesAsZip.mockReset();
    vi.restoreAllMocks();
  });

  it('filters folder input down to root-level JPG/PNG files', () => {
    const rootImage = setWebkitRelativePath(
      new File(['1'], '001.png', { type: 'image/png' }),
      'folder/001.png'
    );
    const nestedImage = setWebkitRelativePath(
      new File(['2'], '002.jpg', { type: 'image/jpeg' }),
      'folder/nested/002.jpg'
    );
    const textFile = setWebkitRelativePath(
      new File(['3'], 'memo.txt', { type: 'text/plain' }),
      'folder/memo.txt'
    );

    expect(filterRootImageFiles(createFileList([rootImage, nestedImage, textFile]))).toEqual([rootImage]);

    const options = createOptions();
    const { result } = renderHook(() => useWorkspaceFileActions(options));

    act(() => {
      result.current.onFolderLoaded({
        target: {
          files: createFileList([rootImage, nestedImage, textFile]),
        },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(options.loadImages).toHaveBeenCalledWith([rootImage]);
    expect(options.logDebug).toHaveBeenCalledWith(
      'info',
      'フォルダ読み込み開始',
      expect.any(Function)
    );
  });

  it('routes PDF export through saveMarkedPdf', async () => {
    const pdfFile = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' });
    const options = {
      ...createOptions(),
      docType: 'pdf' as const,
      pdfFile,
    };
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    pdfServiceMocks.saveMarkedPdf.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.handleExportPdf();
    });

    expect(pdfServiceMocks.saveMarkedPdf).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      options.effectiveExportCuts,
      options.effectiveExportSettings
    );
    expect(alertSpy).not.toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks image export until loaded project bindings are complete', async () => {
    const options = {
      ...createOptions(),
      docType: 'images' as const,
      imageFiles: [new File(['img'], '001.png', { type: 'image/png' })],
      isLoadedProjectActive: true,
      canApplyLoadedProject: false,
    };
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.handleExportImages();
    });

    expect(alertSpy).toHaveBeenCalledWith('論理ページの割当を完了してから書き出してください');
    expect(imageExportServiceMocks.exportImagesAsZip).not.toHaveBeenCalled();
  });
});
