import type { ChangeEvent, DragEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifyImportFiles,
  createWorkspaceImportPlan,
  useWorkspaceFileActions,
} from '../../hooks/useWorkspaceFileActions';
import { createAppSettings } from '../../test/factories';

const pdfServiceMocks = vi.hoisted(() => ({
  saveMarkedPdf: vi.fn(),
  saveImagesAsPdf: vi.fn(),
}));

const imageExportServiceMocks = vi.hoisted(() => ({
  exportImagesAsZip: vi.fn(),
}));

const pdfLibMocks = vi.hoisted(() => ({
  load: vi.fn(),
}));

vi.mock('../../services/pdfService', () => ({
  saveMarkedPdf: pdfServiceMocks.saveMarkedPdf,
  saveImagesAsPdf: pdfServiceMocks.saveImagesAsPdf,
}));

vi.mock('../../services/imageExportService', () => ({
  exportImagesAsZip: imageExportServiceMocks.exportImagesAsZip,
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: pdfLibMocks.load,
  },
}));

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
  loadProjectFile: vi.fn().mockResolvedValue(undefined),
  exportProjectFile: vi.fn(),
  includeProjectFileOnExport: false,
  onDrop: vi.fn(),
  setIsExporting: vi.fn(),
  logDebug: vi.fn(),
});

describe('useWorkspaceFileActions', () => {
  beforeEach(() => {
    pdfServiceMocks.saveMarkedPdf.mockReset();
    pdfServiceMocks.saveImagesAsPdf.mockReset();
    imageExportServiceMocks.exportImagesAsZip.mockReset();
    pdfLibMocks.load.mockReset();
    vi.restoreAllMocks();
  });

  it('classifies project, pdf, image, and unsupported files', () => {
    const files = createFileList([
      new File(['{}'], 'project.cutmark.json', { type: 'application/json' }),
      new File(['pdf'], 'sample.pdf', { type: 'application/pdf' }),
      new File(['img'], '001.png', { type: 'image/png' }),
      new File(['txt'], 'memo.txt', { type: 'text/plain' }),
    ]);

    expect(classifyImportFiles(files)).toEqual({
      projectFiles: [files[0]],
      pdfFiles: [files[1]],
      imageFiles: [files[2]],
      unsupportedFiles: [files[3]],
    });
  });

  it('rejects ambiguous import selections', () => {
    expect(() =>
      createWorkspaceImportPlan({
        projectFiles: [
          new File(['{}'], 'a.cutmark.json', { type: 'application/json' }),
          new File(['{}'], 'b.cutmark.json', { type: 'application/json' }),
        ],
        pdfFiles: [],
        imageFiles: [],
        unsupportedFiles: [],
      })
    ).toThrow('プロジェクトファイルは1つだけ選んでください。');

    expect(() =>
      createWorkspaceImportPlan({
        projectFiles: [],
        pdfFiles: [new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })],
        imageFiles: [new File(['img'], '001.png', { type: 'image/png' })],
        unsupportedFiles: [],
      })
    ).toThrow('素材は PDF 1つ か 連番画像(JPG/PNG) のどちらか一方だけを選んでください。');
  });

  it('loads images and a project file from one selection', async () => {
    const options = createOptions();
    const imageA = new File(['img-a'], '002.png', { type: 'image/png' });
    const imageB = new File(['img-b'], '001.png', { type: 'image/png' });
    const projectFile = new File(['{}'], 'shots.cutmark.json', { type: 'application/json' });
    const event = {
      target: {
        files: createFileList([projectFile, imageA, imageB]),
        value: 'selected',
      },
    } as unknown as ChangeEvent<HTMLInputElement>;

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.onImportFilesSelected(event);
    });

    expect(options.loadImages).toHaveBeenCalledWith([imageB, imageA]);
    expect(options.loadProjectFile).toHaveBeenCalledWith(
      projectFile,
      expect.objectContaining({
        docType: 'images',
        numPages: 2,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
      })
    );
    expect(event.target.value).toBe('');
  });

  it('loads a pdf and project file from one selection', async () => {
    const options = createOptions();
    const pdfFile = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' });
    const projectFile = new File(['{}'], 'sample.cutmark.json', { type: 'application/json' });
    const event = {
      target: {
        files: createFileList([projectFile, pdfFile]),
        value: 'selected',
      },
    } as unknown as ChangeEvent<HTMLInputElement>;

    pdfLibMocks.load.mockResolvedValue({
      getPageCount: () => 3,
    });

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.onImportFilesSelected(event);
    });

    expect(options.loadPdf).toHaveBeenCalledWith(pdfFile);
    expect(options.loadProjectFile).toHaveBeenCalledWith(
      projectFile,
      expect.objectContaining({
        docType: 'pdf',
        numPages: 3,
        currentAssetHints: [
          { sourceKind: 'pdf-page', sourceLabel: 'sample.pdf', pageNumber: 1 },
          { sourceKind: 'pdf-page', sourceLabel: 'sample.pdf', pageNumber: 2 },
          { sourceKind: 'pdf-page', sourceLabel: 'sample.pdf', pageNumber: 3 },
        ],
      })
    );
  });

  it('accepts the same combined import patterns from drag and drop', async () => {
    const options = createOptions();
    const imageFile = new File(['img'], '001.png', { type: 'image/png' });
    const projectFile = new File(['{}'], 'sample.cutmark.json', { type: 'application/json' });
    const event = {
      dataTransfer: {
        types: ['Files'],
        files: createFileList([projectFile, imageFile]),
      },
    } as unknown as DragEvent<HTMLDivElement>;

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.onFileDropped(event);
    });

    expect(options.onDrop).toHaveBeenCalledWith(event);
    expect(options.loadImages).toHaveBeenCalledWith([imageFile]);
    expect(options.loadProjectFile).toHaveBeenCalledWith(
      projectFile,
      expect.objectContaining({
        docType: 'images',
        numPages: 1,
      })
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

  it('downloads the project file alongside PDF export when the option is enabled', async () => {
    const pdfFile = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' });
    const options = {
      ...createOptions(),
      docType: 'pdf' as const,
      pdfFile,
      includeProjectFileOnExport: true,
    };

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    pdfServiceMocks.saveMarkedPdf.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const { result } = renderHook(() => useWorkspaceFileActions(options));

    await act(async () => {
      await result.current.handleExportPdf();
    });

    expect(options.exportProjectFile).toHaveBeenCalledTimes(1);
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

    expect(alertSpy).toHaveBeenCalledWith('カット番号ページの割付を完了してから書き出してください');
    expect(imageExportServiceMocks.exportImagesAsZip).not.toHaveBeenCalled();
  });
});
