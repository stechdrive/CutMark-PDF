import { isValidElement } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectOrganizerPanel } from '../../components/ProjectOrganizerPanel';
import { useAppShellProps } from '../../hooks/useAppShellProps';
import { createAppSettings, createTemplate } from '../../test/factories';

const createProjectOrganizerProps = () => ({
  projectName: 'Loaded project',
  savedAt: '2026-04-18T00:00:00.000Z',
  selectedLogicalPageId: 'page-1',
  organizer: {
    logicalPageCount: 1,
    contePageCount: 1,
    assignedCount: 1,
    matchedCount: 1,
    needsReviewCount: 0,
    unassignedConteCount: 0,
    unplacedLogicalPageCount: 0,
    slots: [
      {
        assetIndex: 0,
        contePageNumber: 1,
        asset: { sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 },
        logicalPageId: 'page-1',
        logicalPageNumber: 1,
        logicalPage: { id: 'page-1', cuts: [], expectedAssetHint: null },
        expectedAsset: null,
        status: 'matched' as const,
        cutCount: 0,
        isSelected: true,
      },
    ],
    unplacedPages: [],
  },
  canApplyProject: true,
  canResetBindings: true,
  canUndoDraft: false,
  canRedoDraft: false,
  onSelectLogicalPage: vi.fn(),
  onInsertBlankPageAtAsset: vi.fn(),
  onRemoveLogicalPageFromConte: vi.fn(),
  onMoveLogicalPageToAsset: vi.fn(),
  onResetBindings: vi.fn(),
  onUndoDraft: vi.fn(),
  onRedoDraft: vi.fn(),
  onApplyProject: vi.fn(),
});

describe('useAppShellProps', () => {
  it('builds component props and toggles loaded-project specific setters', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const setTemplate = vi.fn();
    const setTemplateLive = vi.fn();
    const setSettings = vi.fn();
    const setSettingsLive = vi.fn();
    const logDebug = vi.fn();

    const { result } = renderHook(() =>
      useAppShellProps({
        header: {
          docType: 'images',
          mode: 'edit',
          setMode: vi.fn(),
          isExporting: false,
          canUndo: true,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          onImportFileChange: vi.fn(),
          onExportPdf: vi.fn(),
          onExportImages: vi.fn(),
          includeProjectFileOnExport: true,
          onToggleIncludeProjectFileOnExport: vi.fn(),
          onOpenDebug: vi.fn(),
          showDebug: true,
        },
        preview: {
          docType: 'images',
          pdfFile: null,
          currentImageUrl: 'blob:image',
          numPages: 3,
          setNumPages: vi.fn(),
          currentPage: 2,
          setCurrentPage: vi.fn(),
          scale: 1,
          setScale: vi.fn(),
          isDragging: false,
          dragHandlers: {
            onDragEnter: vi.fn(),
            onDragOver: vi.fn(),
            onDragLeave: vi.fn(),
          },
          onFileDropped: vi.fn(),
          cuts: [],
          selectedCutId: 'cut-1',
          setSelectedCutId: vi.fn(),
          deleteCut: vi.fn(),
          updateCutPosition: vi.fn(),
          handleCutDragEnd: vi.fn(),
          mode: 'edit',
          template,
          setTemplate,
          setTemplateLive,
          onTemplateInteractionStart: vi.fn(),
          onTemplateInteractionEnd: vi.fn(),
          settings,
          projectNotice: {
            title: 'カット番号P2 は未配置です',
            message: '左パネルでコンテへ割り付けると、プレビューが同期します。',
          },
          onContentClick: vi.fn(),
          onPdfPageLoadSuccess: vi.fn(),
          logDebug,
          isLoadedProjectActive: true,
        },
        sidebar: {
          mode: 'edit',
          setMode: vi.fn(),
          pdfFile: null,
          selectedCutId: 'cut-1',
          projectOrganizerProps: createProjectOrganizerProps(),
          templates: [template],
          template,
          setTemplate,
          changeTemplate: vi.fn(),
          saveTemplateByName: vi.fn(),
          deleteTemplate: vi.fn(),
          distributeRows: vi.fn(),
          onRowSnap: vi.fn(),
          settings,
          setSettings,
          setLiveSettings: setSettingsLive,
          onLiveSettingsStart: vi.fn(),
          onLiveSettingsEnd: vi.fn(),
          setNumberingState: vi.fn(),
          onRenumberFromSelected: vi.fn(),
          isLoadedProjectActive: true,
        },
        debugModal: {
          open: true,
          debugTextRef: { current: null },
          debugReport: 'report',
          debugCopyStatus: 'idle',
          onClose: vi.fn(),
          onCopy: vi.fn(),
        },
        exportOverlay: {
          isExporting: false,
        },
      })
    );

    expect(result.current.documentPreviewProps.setTemplate).toBe(setTemplateLive);
    expect(result.current.documentPreviewProps.projectNotice).toEqual({
      title: 'カット番号P2 は未配置です',
      message: '左パネルでコンテへ割り付けると、プレビューが同期します。',
    });
    expect(result.current.sidebarProps.setLiveSettings).toBe(setSettingsLive);
    expect(result.current.exportOverlayProps).toEqual({ isExporting: false });

    expect(isValidElement(result.current.leftProjectPanel)).toBe(true);
    if (isValidElement(result.current.leftProjectPanel)) {
      expect(result.current.leftProjectPanel.type).toBe(ProjectOrganizerPanel);
      expect(result.current.leftProjectPanel.props.projectName).toBe('Loaded project');
    }

    result.current.documentPreviewProps.onPdfLoadSuccess?.(5);
    expect(logDebug).toHaveBeenCalledWith('info', 'PDF読み込み成功', expect.any(Function));
  });

  it('falls back to non-live setters when no loaded project is active', () => {
    const template = createTemplate();
    const setTemplate = vi.fn();
    const setSettings = vi.fn();

    const { result } = renderHook(() =>
      useAppShellProps({
        header: {
          docType: null,
          mode: 'template',
          setMode: vi.fn(),
          isExporting: false,
          canUndo: false,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          onImportFileChange: vi.fn(),
          onExportPdf: vi.fn(),
          onExportImages: vi.fn(),
          includeProjectFileOnExport: false,
          onToggleIncludeProjectFileOnExport: vi.fn(),
          onOpenDebug: vi.fn(),
          showDebug: false,
        },
        preview: {
          docType: null,
          pdfFile: null,
          currentImageUrl: null,
          numPages: 0,
          setNumPages: vi.fn(),
          currentPage: 1,
          setCurrentPage: vi.fn(),
          scale: 1,
          setScale: vi.fn(),
          isDragging: false,
          dragHandlers: {
            onDragEnter: vi.fn(),
            onDragOver: vi.fn(),
            onDragLeave: vi.fn(),
          },
          onFileDropped: vi.fn(),
          cuts: [],
          selectedCutId: null,
          setSelectedCutId: vi.fn(),
          deleteCut: vi.fn(),
          updateCutPosition: vi.fn(),
          handleCutDragEnd: vi.fn(),
          mode: 'template',
          template,
          setTemplate,
          setTemplateLive: vi.fn(),
          settings: createAppSettings(),
          projectNotice: null,
          onContentClick: vi.fn(),
          logDebug: vi.fn(),
          isLoadedProjectActive: false,
        },
        sidebar: {
          mode: 'template',
          setMode: vi.fn(),
          pdfFile: null,
          selectedCutId: null,
          projectOrganizerProps: null,
          templates: [template],
          template,
          setTemplate,
          changeTemplate: vi.fn(),
          saveTemplateByName: vi.fn(),
          deleteTemplate: vi.fn(),
          distributeRows: vi.fn(),
          onRowSnap: vi.fn(),
          settings: createAppSettings(),
          setSettings,
          setLiveSettings: vi.fn(),
          onLiveSettingsStart: vi.fn(),
          onLiveSettingsEnd: vi.fn(),
          setNumberingState: vi.fn(),
          onRenumberFromSelected: vi.fn(),
          isLoadedProjectActive: false,
        },
        debugModal: {
          open: false,
          debugTextRef: { current: null },
          debugReport: '',
          debugCopyStatus: 'idle',
          onClose: vi.fn(),
          onCopy: vi.fn(),
        },
        exportOverlay: {
          isExporting: true,
        },
      })
    );

    expect(result.current.documentPreviewProps.setTemplate).toBe(setTemplate);
    expect(result.current.sidebarProps.setLiveSettings).toBeUndefined();
    expect(result.current.leftProjectPanel).toBeUndefined();
  });
});
