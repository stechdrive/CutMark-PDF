import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorCanvasBehavior } from '../../hooks/useEditorCanvasBehavior';
import { createAppSettings, createTemplate } from '../../test/factories';

describe('useEditorCanvasBehavior', () => {
  it('creates a cut on the selected template row', () => {
    const createCutAt = vi.fn();
    const template = createTemplate({
      xPosition: 0.12,
      rowPositions: [0.1, 0.4],
    });

    const { result } = renderHook(() =>
      useEditorCanvasBehavior({
        docType: 'images',
        pdfFile: null,
        settings: createAppSettings(),
        setSettings: vi.fn(),
        template,
        isLoadedProjectActive: false,
        createCutAt,
      })
    );

    act(() => {
      result.current.handleRowSnap(1);
      result.current.handleRowSnap(5);
    });

    expect(createCutAt).toHaveBeenCalledTimes(1);
    expect(createCutAt).toHaveBeenCalledWith(0.12, 0.4);
  });

  it('applies a PDF-based default font size when the workspace is not loaded from a project', () => {
    const setSettings = vi.fn();
    const settings = createAppSettings({ fontSize: 28 });

    const { result } = renderHook(() =>
      useEditorCanvasBehavior({
        docType: 'pdf',
        pdfFile: new File(['pdf'], 'book.pdf', { type: 'application/pdf' }),
        settings,
        setSettings,
        template: createTemplate(),
        isLoadedProjectActive: false,
        createCutAt: vi.fn(),
      })
    );

    act(() => {
      result.current.applyPdfDefaultFontSize({ originalWidth: 2481 });
    });

    expect(setSettings).toHaveBeenCalledTimes(1);
    const updater = setSettings.mock.calls[0][0];
    expect(updater(settings)).toMatchObject({ fontSize: 56 });
  });

  it('does not auto-adjust font size while editing a loaded project', () => {
    const setSettings = vi.fn();

    const { result } = renderHook(() =>
      useEditorCanvasBehavior({
        docType: 'pdf',
        pdfFile: new File(['pdf'], 'book.pdf', { type: 'application/pdf' }),
        settings: createAppSettings({ fontSize: 28 }),
        setSettings,
        template: createTemplate(),
        isLoadedProjectActive: true,
        createCutAt: vi.fn(),
      })
    );

    act(() => {
      result.current.applyPdfDefaultFontSize({ originalWidth: 2481 });
    });

    expect(setSettings).not.toHaveBeenCalled();
  });
});
