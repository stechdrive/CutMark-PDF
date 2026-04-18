import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useEditorSessions } from '../../hooks/useEditorSessions';
import { createAppSettings, createTemplate } from '../../test/factories';

const currentSessionMocks = vi.hoisted(() => ({
  useCurrentProjectSession: vi.fn(),
}));

const loadedSessionMocks = vi.hoisted(() => ({
  useLoadedProjectSession: vi.fn(),
}));

vi.mock('../../hooks/useCurrentProjectSession', () => ({
  useCurrentProjectSession: currentSessionMocks.useCurrentProjectSession,
}));

vi.mock('../../hooks/useLoadedProjectSession', () => ({
  useLoadedProjectSession: loadedSessionMocks.useLoadedProjectSession,
}));

describe('useEditorSessions', () => {
  beforeEach(() => {
    currentSessionMocks.useCurrentProjectSession.mockReset();
    loadedSessionMocks.useLoadedProjectSession.mockReset();
  });

  it('composes current and loaded project sessions', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const currentProjectSession = { id: 'current-session' };
    const loadedProject = createProjectDocument({
      settings,
      template,
      name: 'Loaded',
      logicalPages: [],
    });
    const loadedProjectSession = {
      project: loadedProject,
      id: 'loaded-session',
    };

    currentSessionMocks.useCurrentProjectSession.mockReturnValue(currentProjectSession);
    loadedSessionMocks.useLoadedProjectSession.mockReturnValue(loadedProjectSession);

    const options = {
      docType: 'images' as const,
      currentPage: 1,
      numPages: 1,
      currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
      currentProjectName: 'current-folder',
      settings,
      numberingState: {
        nextNumber: settings.nextNumber,
        branchChar: settings.branchChar,
      },
      setNumberingState: vi.fn(),
      template,
    };

    const { result } = renderHook(() => useEditorSessions(options));

    expect(currentSessionMocks.useCurrentProjectSession).toHaveBeenCalledWith(options);
    expect(loadedSessionMocks.useLoadedProjectSession).toHaveBeenCalledWith(
      options.currentAssetHints,
      options.settings
    );
    expect(result.current.currentProjectSession).toBe(currentProjectSession);
    expect(result.current.loadedProjectSession).toBe(loadedProjectSession);
    expect(result.current.loadedProject).toBe(loadedProject);
    expect(result.current.isLoadedProjectActive).toBe(true);
  });
});
