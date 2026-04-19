import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../test/factories';
import { useTemplates } from '../../hooks/useTemplates';

const STORAGE_KEY = 'cutmark_templates';

describe('useTemplates', () => {
  it('loads templates from localStorage when present', () => {
    const savedTemplate = createTemplate({
      id: 'saved',
      name: '保存済み',
      rowCount: 3,
      rowPositions: [0.1, 0.5, 0.9],
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify([savedTemplate]));

    const { result } = renderHook(() => useTemplates());

    expect(result.current.templates).toEqual([savedTemplate]);
    expect(result.current.template).toEqual(savedTemplate);
  });

  it('creates a new template and persists it', async () => {
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.setTemplate((current) => ({
        ...current,
        rowCount: 3,
        rowPositions: [0.2, 0.5, 0.8],
      }));
    });

    act(() => {
      result.current.saveTemplateByName('新規テンプレート');
    });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(saved).toHaveLength(2);
    });

    expect(result.current.templates).toHaveLength(2);
    expect(result.current.template.name).toBe('新規テンプレート');
  });

  it('overwrites another template only after confirmation', async () => {
    const defaultTemplate = createTemplate();
    const existingTemplate = createTemplate({
      id: 'alt',
      name: '別テンプレート',
      rowCount: 4,
      xPosition: 0.25,
      rowPositions: [0.1, 0.3, 0.5, 0.7],
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([defaultTemplate, existingTemplate])
    );

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.setTemplate((current) => ({
        ...current,
        xPosition: 0.42,
        rowCount: 4,
        rowPositions: [0.2, 0.4, 0.6, 0.8],
      }));
    });

    act(() => {
      result.current.saveTemplateByName('別テンプレート');
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      const overwritten = result.current.templates.find((t) => t.id === 'alt');
      expect(overwritten?.xPosition).toBe(0.42);
    });

    expect(result.current.templates).toHaveLength(2);
    expect(result.current.template.id).toBe('alt');
  });

  it('does not remove the last remaining template', () => {
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.deleteTemplate();
    });

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.template.id).toBe('default');
  });

  it('redistributes rows evenly between the first and last row', () => {
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.setTemplate((current) => ({
        ...current,
        rowCount: 4,
        rowPositions: [0.1, 0.22, 0.7, 0.9],
      }));
    });

    act(() => {
      result.current.distributeRows();
    });

    expect(result.current.template.rowPositions[0]).toBeCloseTo(0.1);
    expect(result.current.template.rowPositions[1]).toBeCloseTo(0.366666, 5);
    expect(result.current.template.rowPositions[2]).toBeCloseTo(0.633333, 5);
    expect(result.current.template.rowPositions[3]).toBeCloseTo(0.9);
  });

  it('upserts a loaded template and selects it', async () => {
    const { result } = renderHook(() => useTemplates());
    const loadedTemplate = createTemplate({
      id: 'loaded-template',
      name: '読込テンプレート',
      rowCount: 4,
      rowPositions: [0.1, 0.3, 0.5, 0.7],
    });

    act(() => {
      result.current.upsertTemplate(loadedTemplate);
    });

    expect(result.current.template).toEqual(loadedTemplate);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toContainEqual(loadedTemplate);
    });
  });

  it('imports a template document, renames duplicate names, and selects the first imported template', async () => {
    const existingTemplate = createTemplate({
      id: 'existing',
      name: '持込テンプレート',
      rowCount: 4,
      rowPositions: [0.1, 0.3, 0.5, 0.7],
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([createTemplate(), existingTemplate]));

    const { result } = renderHook(() => useTemplates());

    let imported:
      | { scope: 'single' | 'multiple'; templates: ReturnType<typeof useTemplates>['templates'] }
      | undefined;

    act(() => {
      imported = result.current.importTemplateDocument(
        JSON.stringify({
          kind: 'cutmark-template-bundle',
          version: 1,
          templates: [
            {
              name: '持込テンプレート',
              rowCount: 3,
              xPosition: 0.22,
              rowPositions: [0.1, 0.5, 0.9],
            },
            {
              name: '持込テンプレート',
              rowCount: 2,
              xPosition: 0.3,
              rowPositions: [0.2, 0.8],
            },
          ],
        })
      );
    });

    expect(imported?.scope).toBe('multiple');
    expect(imported?.templates.map((template) => template.name)).toEqual([
      '持込テンプレート (2)',
      '持込テンプレート (3)',
    ]);
    expect(result.current.template.name).toBe('持込テンプレート (2)');

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(4);
    });
  });
});
