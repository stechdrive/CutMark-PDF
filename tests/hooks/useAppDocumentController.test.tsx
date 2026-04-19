import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppDocumentController } from '../../hooks/useAppDocumentController';
import { createAppSettings, createTemplate } from '../../test/factories';

const appSettingsMocks = vi.hoisted(() => ({
  useAppSettings: vi.fn(),
}));

const resetControllerMocks = vi.hoisted(() => ({
  useDocumentResetController: vi.fn(),
}));

const documentViewerMocks = vi.hoisted(() => ({
  useDocumentViewer: vi.fn(),
}));

const templateMocks = vi.hoisted(() => ({
  useTemplates: vi.fn(),
}));

const metadataMocks = vi.hoisted(() => ({
  useCurrentDocumentMetadata: vi.fn(),
}));

vi.mock('../../hooks/useAppSettings', () => ({ useAppSettings: appSettingsMocks.useAppSettings }));
vi.mock('../../hooks/useDocumentResetController', () => ({
  useDocumentResetController: resetControllerMocks.useDocumentResetController,
}));
vi.mock('../../hooks/useDocumentViewer', () => ({
  useDocumentViewer: documentViewerMocks.useDocumentViewer,
}));
vi.mock('../../hooks/useTemplates', () => ({ useTemplates: templateMocks.useTemplates }));
vi.mock('../../hooks/useCurrentDocumentMetadata', () => ({
  useCurrentDocumentMetadata: metadataMocks.useCurrentDocumentMetadata,
}));

describe('useAppDocumentController', () => {
  beforeEach(() => {
    appSettingsMocks.useAppSettings.mockReset();
    resetControllerMocks.useDocumentResetController.mockReset();
    documentViewerMocks.useDocumentViewer.mockReset();
    templateMocks.useTemplates.mockReset();
    metadataMocks.useCurrentDocumentMetadata.mockReset();
  });

  it('composes settings, document viewer, templates, and metadata', () => {
    const settings = createAppSettings();
    const setSettings = vi.fn();
    const handleDocumentReset = vi.fn();
    const setResetHandler = vi.fn();
    const documentViewer = {
      docType: 'images' as const,
      pdfFile: null,
      imageFiles: [new File(['img'], '001.png', { type: 'image/png' })],
      currentImageUrl: 'blob:image',
      numPages: 2,
      currentPage: 1,
      scale: 1,
      isDragging: false,
      loadPdf: vi.fn(),
      loadImages: vi.fn(),
      setNumPages: vi.fn(),
      setCurrentPage: vi.fn(),
      setScale: vi.fn(),
      dragHandlers: {
        onDragEnter: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      },
    };
    const template = createTemplate();
    const templateApi = {
      templates: [template],
      template,
      setTemplate: vi.fn(),
      changeTemplate: vi.fn(),
      saveTemplateByName: vi.fn(),
      saveTemplateDraftByName: vi.fn(() => template),
      deleteTemplate: vi.fn(),
      deleteTemplateById: vi.fn(() => template),
      distributeRows: vi.fn(),
      upsertTemplate: vi.fn(),
      importTemplateDocument: vi.fn(),
    };
    const metadata = {
      currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
      currentProjectName: 'shots',
    };

    appSettingsMocks.useAppSettings.mockReturnValue({ settings, setSettings });
    resetControllerMocks.useDocumentResetController.mockReturnValue({
      handleDocumentReset,
      setResetHandler,
    });
    documentViewerMocks.useDocumentViewer.mockReturnValue(documentViewer);
    templateMocks.useTemplates.mockReturnValue(templateApi);
    metadataMocks.useCurrentDocumentMetadata.mockReturnValue(metadata);

    const { result } = renderHook(() => useAppDocumentController());

    expect(documentViewerMocks.useDocumentViewer).toHaveBeenCalledWith(handleDocumentReset);
    expect(metadataMocks.useCurrentDocumentMetadata).toHaveBeenCalledWith({
      docType: 'images',
      pdfFile: null,
      imageFiles: documentViewer.imageFiles,
      numPages: 2,
    });
    expect(result.current.settings).toBe(settings);
    expect(result.current.template).toBe(template);
    expect(result.current.currentAssetHints).toBe(metadata.currentAssetHints);
    expect(result.current.currentProjectName).toBe('shots');
    expect(result.current.setResetHandler).toBe(setResetHandler);
    expect(result.current.numberingState).toEqual({
      nextNumber: settings.nextNumber,
      branchChar: settings.branchChar,
    });
  });
});
