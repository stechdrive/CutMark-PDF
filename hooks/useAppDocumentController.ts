import { useCallback, useMemo } from 'react';
import { NumberingState } from '../types';
import { useCurrentDocumentMetadata } from './useCurrentDocumentMetadata';
import { useDocumentViewer } from './useDocumentViewer';
import { useTemplates } from './useTemplates';
import { useAppSettings } from './useAppSettings';
import { useDocumentResetController } from './useDocumentResetController';

export const useAppDocumentController = () => {
  const { settings, setSettings } = useAppSettings();

  const setNumberingState = useCallback((next: NumberingState) => {
    setSettings((prev) => ({
      ...prev,
      nextNumber: next.nextNumber,
      branchChar: next.branchChar,
    }));
  }, [setSettings]);

  const numberingState = useMemo(() => ({
    nextNumber: settings.nextNumber,
    branchChar: settings.branchChar,
  }), [settings.branchChar, settings.nextNumber]);

  const {
    handleDocumentReset,
    setResetHandler,
  } = useDocumentResetController();
  const {
    docType,
    pdfFile,
    imageFiles,
    currentImageUrl,
    numPages,
    currentPage,
    scale,
    isDragging,
    loadPdf,
    loadImages,
    setNumPages,
    setCurrentPage,
    setScale,
    dragHandlers,
  } = useDocumentViewer(handleDocumentReset);
  const {
    templates,
    template,
    setTemplate,
    changeTemplate,
    saveTemplateByName,
    saveTemplateDraftByName,
    deleteTemplate,
    deleteTemplateById,
    distributeRows,
    upsertTemplate,
  } = useTemplates();

  const {
    currentAssetHints,
    currentProjectName,
  } = useCurrentDocumentMetadata({
    docType,
    pdfFile,
    imageFiles,
    numPages,
  });

  return {
    settings,
    setSettings,
    numberingState,
    setNumberingState,
    setResetHandler,
    docType,
    pdfFile,
    imageFiles,
    currentImageUrl,
    numPages,
    currentPage,
    scale,
    isDragging,
    loadPdf,
    loadImages,
    setNumPages,
    setCurrentPage,
    setScale,
    dragHandlers,
    templates,
    template,
    setTemplate,
    changeTemplate,
    saveTemplateByName,
    saveTemplateDraftByName,
    deleteTemplate,
    deleteTemplateById,
    distributeRows,
    upsertTemplate,
    currentAssetHints,
    currentProjectName,
  };
};

export type AppDocumentControllerState = ReturnType<typeof useAppDocumentController>;
