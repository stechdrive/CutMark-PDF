import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useProjectLifecycle } from '../../hooks/useProjectLifecycle';
import { createAppSettings, createTemplate } from '../../test/factories';

const repositoryMocks = vi.hoisted(() => ({
  loadProjectDocumentFromFile: vi.fn(),
  downloadProjectDocument: vi.fn(),
}));

vi.mock('../../repositories/projectRepository', () => ({
  loadProjectDocumentFromFile: repositoryMocks.loadProjectDocumentFromFile,
  downloadProjectDocument: repositoryMocks.downloadProjectDocument,
}));

const createProject = (name = 'Episode 01', pageCount = 1) =>
  createProjectDocument({
    settings: createAppSettings(),
    template: createTemplate(),
    name,
    logicalPages: Array.from({ length: pageCount }, (_, index) => ({
      id: `page-${index + 1}`,
      cuts: index === 0
        ? [{ id: 'cut-1', x: 0.1, y: 0.2, label: '001', isBranch: false }]
        : [],
      expectedAssetHint: null,
    })),
  });

describe('useProjectLifecycle', () => {
  beforeEach(() => {
    repositoryMocks.loadProjectDocumentFromFile.mockReset();
    repositoryMocks.downloadProjectDocument.mockReset();
    vi.restoreAllMocks();
  });

  it('saves the current project through the shared project contract', () => {
    const currentProject = createProject('Current');
    const resolvedProject = {
      ...currentProject,
      meta: {
        ...currentProject.meta,
        savedAt: '2026-04-18T00:00:00.000Z',
      },
    };

    const loadProjectIntoEditor = vi.fn();
    const replaceEditorProject = vi.fn();
    const logDebug = vi.fn();

    const { result } = renderHook(() =>
      useProjectLifecycle({
        docType: 'images',
        numPages: 1,
        currentAssetHints: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        loadedProject: null,
        projectBindings: {},
        currentProject,
        currentProjectBindings: { 'page-1': 0 },
        canApplyLoadedProject: false,
        resolveProjectDocumentForCurrentState: vi.fn(() => resolvedProject),
        loadProjectIntoEditor,
        replaceEditorProject,
        upsertTemplate: vi.fn(),
        setMode: vi.fn(),
        logDebug,
      })
    );

    act(() => {
      result.current.handleSaveProject();
    });

    expect(loadProjectIntoEditor).toHaveBeenCalledWith(resolvedProject);
    expect(replaceEditorProject).not.toHaveBeenCalled();
    expect(repositoryMocks.downloadProjectDocument).toHaveBeenCalledWith(resolvedProject);
    expect(logDebug).toHaveBeenCalledWith(
      'info',
      'プロジェクト保存',
      expect.any(Function)
    );
  });

  it('saves a loaded project even when no asset document is open', () => {
    const loadedProject = createProject('Loaded');
    const resolvedProject = {
      ...loadedProject,
      meta: {
        ...loadedProject.meta,
        savedAt: '2026-04-18T01:23:45.000Z',
      },
    };

    const replaceEditorProject = vi.fn();

    const { result } = renderHook(() =>
      useProjectLifecycle({
        docType: null,
        numPages: 0,
        currentAssetHints: [],
        loadedProject,
        projectBindings: { 'page-1': null },
        currentProject: null,
        currentProjectBindings: {},
        canApplyLoadedProject: false,
        resolveProjectDocumentForCurrentState: vi.fn(() => resolvedProject),
        loadProjectIntoEditor: vi.fn(),
        replaceEditorProject,
        upsertTemplate: vi.fn(),
        setMode: vi.fn(),
        logDebug: vi.fn(),
      })
    );

    act(() => {
      result.current.handleSaveProject();
    });

    expect(replaceEditorProject).toHaveBeenCalledWith(resolvedProject, { 'page-1': null });
    expect(repositoryMocks.downloadProjectDocument).toHaveBeenCalledWith(resolvedProject);
  });

  it('loads a project file and applies it immediately when page counts match', async () => {
    const project = createProject('Loaded');
    repositoryMocks.loadProjectDocumentFromFile.mockResolvedValue(project);

    const loadProjectIntoEditor = vi.fn();
    const upsertTemplate = vi.fn();
    const setMode = vi.fn();
    const logDebug = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const event = {
      target: {
        files: [new File(['{}'], 'loaded.cutmark.json', { type: 'application/json' })],
        value: 'loaded.cutmark.json',
      },
    } as unknown as ChangeEvent<HTMLInputElement>;

    const { result } = renderHook(() =>
      useProjectLifecycle({
        docType: 'images',
        numPages: 1,
        currentAssetHints: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        loadedProject: null,
        projectBindings: {},
        currentProject: null,
        currentProjectBindings: {},
        canApplyLoadedProject: false,
        resolveProjectDocumentForCurrentState: vi.fn((value) => value),
        loadProjectIntoEditor,
        replaceEditorProject: vi.fn(),
        upsertTemplate,
        setMode,
        logDebug,
      })
    );

    await act(async () => {
      await result.current.onProjectLoaded(event);
    });

    expect(repositoryMocks.loadProjectDocumentFromFile).toHaveBeenCalledTimes(1);
    expect(loadProjectIntoEditor).toHaveBeenCalledWith(project);
    expect(upsertTemplate).toHaveBeenCalled();
    expect(setMode).toHaveBeenCalledWith('edit');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(event.target.value).toBe('');
  });

  it('loads a project file against an explicit import context', async () => {
    const project = createProject('Loaded');
    repositoryMocks.loadProjectDocumentFromFile.mockResolvedValue(project);

    const loadProjectIntoEditor = vi.fn();
    const upsertTemplate = vi.fn();
    const setMode = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useProjectLifecycle({
        docType: null,
        numPages: 0,
        currentAssetHints: [],
        loadedProject: null,
        projectBindings: {},
        currentProject: null,
        currentProjectBindings: {},
        canApplyLoadedProject: false,
        resolveProjectDocumentForCurrentState: vi.fn((value) => value),
        loadProjectIntoEditor,
        replaceEditorProject: vi.fn(),
        upsertTemplate,
        setMode,
        logDebug: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.loadProjectFile(
        new File(['{}'], 'loaded.cutmark.json', { type: 'application/json' }),
        {
          docType: 'images',
          numPages: 1,
          currentAssetHints: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        }
      );
    });

    expect(loadProjectIntoEditor).toHaveBeenCalledWith(project);
    expect(upsertTemplate).toHaveBeenCalled();
    expect(setMode).toHaveBeenCalledWith('edit');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
