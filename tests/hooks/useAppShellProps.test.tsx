import { isValidElement } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarProjectPanel } from '../../components/SidebarProjectPanel';
import { useAppShellProps } from '../../hooks/useAppShellProps';
import { createAppSettings, createTemplate } from '../../test/factories';

const createProjectPanelProps = () => ({
  projectName: 'Loaded project',
  savedAt: '2026-04-18T00:00:00.000Z',
  selectedLogicalPageId: 'page-1',
  statusMessage: 'status',
  comparison: {
    logicalPageCount: 1,
    currentAssetCount: 1,
    matchedPageCount: 1,
    needsReviewCount: 0,
    missingAssetCount: 0,
    extraAssetCount: 0,
    canApplyByPageCount: true,
    rows: [],
  },
  bindings: { 'page-1': 0 as const },
  assignedCount: 1,
  currentAssets: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
  canApplyProject: true,
  canResetBindings: true,
  canUndoDraft: false,
  canRedoDraft: false,
  onSelectLogicalPage: vi.fn(),
  onBindingChange: vi.fn(),
  onInsertLogicalPageAfter: vi.fn(),
  onRemoveLogicalPage: vi.fn(),
  onMoveLogicalPage: vi.fn(),
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
          canExportProject: true,
          onExportProject: vi.fn(),
          onExportPdf: vi.fn(),
          onExportImages: vi.fn(),
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
            title: '論理P2 は未割当です',
            message: '右パネルで現在の素材ページを割り当てると、プレビューが同期します。',
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
          projectPanelProps: createProjectPanelProps(),
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
      title: '論理P2 は未割当です',
      message: '右パネルで現在の素材ページを割り当てると、プレビューが同期します。',
    });
    expect(result.current.sidebarProps.setLiveSettings).toBe(setSettingsLive);
    expect(result.current.exportOverlayProps).toEqual({ isExporting: false });

    expect(isValidElement(result.current.sidebarProps.projectPanel)).toBe(true);
    if (isValidElement(result.current.sidebarProps.projectPanel)) {
      expect(result.current.sidebarProps.projectPanel.type).toBe(SidebarProjectPanel);
      expect(result.current.sidebarProps.projectPanel.props.projectName).toBe('Loaded project');
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
          canExportProject: false,
          onExportProject: vi.fn(),
          onExportPdf: vi.fn(),
          onExportImages: vi.fn(),
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
          projectPanelProps: null,
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
    expect(result.current.sidebarProps.projectPanel).toBeUndefined();
  });
});
