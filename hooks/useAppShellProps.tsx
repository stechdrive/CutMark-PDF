import React, { ComponentProps, useMemo } from 'react';
import { Header } from '../components/Header';
import { DocumentPreview } from '../components/DocumentPreview';
import { Sidebar } from '../components/Sidebar';
import { DebugModal } from '../components/DebugModal';
import { ExportOverlay } from '../components/ExportOverlay';
import { SidebarProjectPanel } from '../components/SidebarProjectPanel';
import { normalizeError } from '../utils/debugData';

interface UseAppShellPropsOptions {
  header: {
    docType: ComponentProps<typeof Header>['docType'];
    mode: ComponentProps<typeof Header>['mode'];
    setMode: ComponentProps<typeof Header>['setMode'];
    isExporting: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onPdfFileChange: ComponentProps<typeof Header>['onPdfFileChange'];
    onFolderChange: ComponentProps<typeof Header>['onFolderChange'];
    onProjectFileChange: ComponentProps<typeof Header>['onProjectFileChange'];
    onSaveProject: () => void;
    onExportPdf: () => void;
    onExportImages: () => void;
    onOpenDebug: () => void;
    showDebug: boolean;
  };
  preview: {
    docType: ComponentProps<typeof DocumentPreview>['docType'];
    pdfFile: ComponentProps<typeof DocumentPreview>['pdfFile'];
    currentImageUrl: ComponentProps<typeof DocumentPreview>['currentImageUrl'];
    numPages: number;
    setNumPages: (num: number) => void;
    currentPage: number;
    setCurrentPage: (num: number) => void;
    scale: number;
    setScale: ComponentProps<typeof DocumentPreview>['setScale'];
    isDragging: boolean;
    dragHandlers: ComponentProps<typeof DocumentPreview>['dragHandlers'];
    onFileDropped: ComponentProps<typeof DocumentPreview>['onFileDropped'];
    cuts: ComponentProps<typeof DocumentPreview>['cuts'];
    selectedCutId: string | null;
    setSelectedCutId: (id: string | null) => void;
    deleteCut: (id: string) => void;
    updateCutPosition: (id: string, x: number, y: number) => void;
    handleCutDragEnd: () => void;
    mode: ComponentProps<typeof DocumentPreview>['mode'];
    template: ComponentProps<typeof DocumentPreview>['template'];
    setTemplate: ComponentProps<typeof DocumentPreview>['setTemplate'];
    setTemplateLive: ComponentProps<typeof DocumentPreview>['setTemplate'];
    onTemplateInteractionStart?: () => void;
    onTemplateInteractionEnd?: () => void;
    settings: ComponentProps<typeof DocumentPreview>['settings'];
    projectNotice?: ComponentProps<typeof DocumentPreview>['projectNotice'];
    onContentClick: (x: number, y: number) => void;
    onPdfPageLoadSuccess?: ComponentProps<typeof DocumentPreview>['onPdfPageLoadSuccess'];
    logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: unknown | (() => unknown)) => void;
    isLoadedProjectActive: boolean;
  };
  sidebar: {
    mode: ComponentProps<typeof Sidebar>['mode'];
    setMode: ComponentProps<typeof Sidebar>['setMode'];
    pdfFile: File | null;
    selectedCutId: string | null;
    projectPanelProps: ComponentProps<typeof SidebarProjectPanel> | null;
    templates: ComponentProps<typeof Sidebar>['templates'];
    template: ComponentProps<typeof Sidebar>['template'];
    setTemplate: ComponentProps<typeof Sidebar>['setTemplate'];
    changeTemplate: ComponentProps<typeof Sidebar>['changeTemplate'];
    saveTemplateByName: ComponentProps<typeof Sidebar>['saveTemplateByName'];
    deleteTemplate: ComponentProps<typeof Sidebar>['deleteTemplate'];
    distributeRows: ComponentProps<typeof Sidebar>['distributeRows'];
    onRowSnap: ComponentProps<typeof Sidebar>['onRowSnap'];
    settings: ComponentProps<typeof Sidebar>['settings'];
    setSettings: ComponentProps<typeof Sidebar>['setSettings'];
    setLiveSettings?: ComponentProps<typeof Sidebar>['setLiveSettings'];
    onLiveSettingsStart?: ComponentProps<typeof Sidebar>['onLiveSettingsStart'];
    onLiveSettingsEnd?: ComponentProps<typeof Sidebar>['onLiveSettingsEnd'];
    setNumberingState: ComponentProps<typeof Sidebar>['setNumberingState'];
    onRenumberFromSelected: ComponentProps<typeof Sidebar>['onRenumberFromSelected'];
    isLoadedProjectActive: boolean;
  };
  debugModal: {
    open: boolean;
    debugTextRef: ComponentProps<typeof DebugModal>['debugTextRef'];
    debugReport: string;
    debugCopyStatus: ComponentProps<typeof DebugModal>['debugCopyStatus'];
    onClose: () => void;
    onCopy: () => void;
  };
  exportOverlay: {
    isExporting: boolean;
  };
}

export const useAppShellProps = ({
  header,
  preview,
  sidebar,
  debugModal,
  exportOverlay,
}: UseAppShellPropsOptions) => {
  const projectPanel = useMemo(
    () =>
      sidebar.projectPanelProps ? (
        <SidebarProjectPanel {...sidebar.projectPanelProps} />
      ) : undefined,
    [sidebar.projectPanelProps]
  );

  const headerProps: ComponentProps<typeof Header> = {
    docType: header.docType,
    onPdfFileChange: header.onPdfFileChange,
    onFolderChange: header.onFolderChange,
    onProjectFileChange: header.onProjectFileChange,
    onSaveProject: header.onSaveProject,
    onExportPdf: header.onExportPdf,
    onExportImages: header.onExportImages,
    isExporting: header.isExporting,
    mode: header.mode,
    setMode: header.setMode,
    canUndo: header.canUndo,
    canRedo: header.canRedo,
    onUndo: header.onUndo,
    onRedo: header.onRedo,
    onOpenDebug: header.onOpenDebug,
    showDebug: header.showDebug,
  };

  const documentPreviewProps: ComponentProps<typeof DocumentPreview> = {
    docType: preview.docType,
    pdfFile: preview.pdfFile,
    currentImageUrl: preview.currentImageUrl,
    numPages: preview.numPages,
    setNumPages: preview.setNumPages,
    currentPage: preview.currentPage,
    setCurrentPage: preview.setCurrentPage,
    scale: preview.scale,
    setScale: preview.setScale,
    isDragging: preview.isDragging,
    dragHandlers: preview.dragHandlers,
    onFileDropped: preview.onFileDropped,
    cuts: preview.cuts,
    selectedCutId: preview.selectedCutId,
    setSelectedCutId: preview.setSelectedCutId,
    deleteCut: preview.deleteCut,
    updateCutPosition: preview.updateCutPosition,
    handleCutDragEnd: preview.handleCutDragEnd,
    mode: preview.mode,
    template: preview.template,
    setTemplate: preview.isLoadedProjectActive ? preview.setTemplateLive : preview.setTemplate,
    onTemplateInteractionStart: preview.isLoadedProjectActive ? preview.onTemplateInteractionStart : undefined,
    onTemplateInteractionEnd: preview.isLoadedProjectActive ? preview.onTemplateInteractionEnd : undefined,
    settings: preview.settings,
    projectNotice: preview.projectNotice,
    onContentClick: preview.onContentClick,
    onPdfLoadSuccess: (pages) => preview.logDebug('info', 'PDF読み込み成功', () => ({ numPages: pages })),
    onPdfLoadError: (error) => preview.logDebug('error', 'PDF読み込み失敗', () => ({ error: normalizeError(error) })),
    onPdfSourceError: (error) => preview.logDebug('error', 'PDFソース読み込み失敗', () => ({ error: normalizeError(error) })),
    onPdfPageLoadSuccess: preview.onPdfPageLoadSuccess,
    onPdfPageError: (error) => preview.logDebug('error', 'PDFページ読み込み失敗', () => ({ error: normalizeError(error) })),
    onImageLoadError: (src) => preview.logDebug('error', '画像読み込み失敗', () => ({ src })),
  };

  const sidebarProps: ComponentProps<typeof Sidebar> = {
    mode: sidebar.mode,
    setMode: sidebar.setMode,
    pdfFile: sidebar.pdfFile,
    selectedCutId: sidebar.selectedCutId,
    projectPanel,
    templates: sidebar.templates,
    template: sidebar.template,
    setTemplate: sidebar.setTemplate,
    changeTemplate: sidebar.changeTemplate,
    saveTemplateByName: sidebar.saveTemplateByName,
    deleteTemplate: sidebar.deleteTemplate,
    distributeRows: sidebar.distributeRows,
    onRowSnap: sidebar.onRowSnap,
    settings: sidebar.settings,
    setSettings: sidebar.setSettings,
    setLiveSettings: sidebar.isLoadedProjectActive ? sidebar.setLiveSettings : undefined,
    onLiveSettingsStart: sidebar.isLoadedProjectActive ? sidebar.onLiveSettingsStart : undefined,
    onLiveSettingsEnd: sidebar.isLoadedProjectActive ? sidebar.onLiveSettingsEnd : undefined,
    setNumberingState: sidebar.setNumberingState,
    onRenumberFromSelected: sidebar.onRenumberFromSelected,
  };

  const debugModalProps: ComponentProps<typeof DebugModal> = {
    open: debugModal.open,
    debugTextRef: debugModal.debugTextRef,
    debugReport: debugModal.debugReport,
    debugCopyStatus: debugModal.debugCopyStatus,
    onClose: debugModal.onClose,
    onCopy: debugModal.onCopy,
  };

  const exportOverlayProps: ComponentProps<typeof ExportOverlay> = {
    isExporting: exportOverlay.isExporting,
  };

  return {
    headerProps,
    documentPreviewProps,
    sidebarProps,
    debugModalProps,
    exportOverlayProps,
  };
};
