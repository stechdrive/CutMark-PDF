import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { AppSettings, Template } from '../types';

const DEFAULT_IMAGE_FONT_SIZE = 28;
const IMAGE_A4_WIDTH_AT_150_DPI = 1240.5;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 72;

interface UseEditorCanvasBehaviorOptions {
  docType: 'pdf' | 'images' | null;
  pdfFile: File | null;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  template: Template;
  isLoadedProjectActive: boolean;
  createCutAt: (x: number, y: number) => void;
}

export const useEditorCanvasBehavior = ({
  docType,
  pdfFile,
  settings,
  setSettings,
  template,
  isLoadedProjectActive,
  createCutAt,
}: UseEditorCanvasBehaviorOptions) => {
  const pdfFontSizeAppliedRef = useRef(false);
  const pdfAutoFontSizeRef = useRef<number | null>(null);

  useEffect(() => {
    pdfFontSizeAppliedRef.current = false;
  }, [pdfFile]);

  useEffect(() => {
    if (isLoadedProjectActive) return;
    if (docType !== 'images') return;
    if (pdfAutoFontSizeRef.current !== null && settings.fontSize === pdfAutoFontSizeRef.current) {
      setSettings((prev) => ({
        ...prev,
        fontSize: DEFAULT_IMAGE_FONT_SIZE,
      }));
    }
    pdfAutoFontSizeRef.current = null;
  }, [docType, isLoadedProjectActive, settings.fontSize, setSettings]);

  const handleRowSnap = useCallback((rowIndex: number) => {
    if (rowIndex >= template.rowPositions.length) return;

    const y = template.rowPositions[rowIndex];
    const x = template.xPosition;
    createCutAt(x, y);
  }, [createCutAt, template]);

  const applyPdfDefaultFontSize = useCallback((page: { originalWidth: number }) => {
    if (isLoadedProjectActive) return;
    if (docType !== 'pdf') return;
    if (pdfFontSizeAppliedRef.current) return;
    if (settings.fontSize !== DEFAULT_IMAGE_FONT_SIZE) return;

    const ratio = DEFAULT_IMAGE_FONT_SIZE / IMAGE_A4_WIDTH_AT_150_DPI;
    const proposed = Math.round(page.originalWidth * ratio);
    const nextFontSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, proposed));

    pdfFontSizeAppliedRef.current = true;
    pdfAutoFontSizeRef.current = nextFontSize;
    if (nextFontSize !== settings.fontSize) {
      setSettings((prev) => ({
        ...prev,
        fontSize: nextFontSize,
      }));
    }
  }, [docType, isLoadedProjectActive, settings.fontSize, setSettings]);

  return {
    handleRowSnap,
    applyPdfDefaultFontSize,
  };
};
