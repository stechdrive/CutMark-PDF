import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppController } from '../../hooks/useAppController';

const debugLoggerMocks = vi.hoisted(() => ({
  useDebugLogger: vi.fn(),
}));
const workspaceControllerMocks = vi.hoisted(() => ({
  useAppWorkspaceController: vi.fn(),
}));
const presentationControllerMocks = vi.hoisted(() => ({
  useAppPresentationController: vi.fn(),
}));

vi.mock('../../hooks/useDebugLogger', () => ({ useDebugLogger: debugLoggerMocks.useDebugLogger }));
vi.mock('../../hooks/useAppWorkspaceController', () => ({
  useAppWorkspaceController: workspaceControllerMocks.useAppWorkspaceController,
}));
vi.mock('../../hooks/useAppPresentationController', () => ({
  useAppPresentationController: presentationControllerMocks.useAppPresentationController,
}));

describe('useAppController', () => {
  beforeEach(() => {
    debugLoggerMocks.useDebugLogger.mockReset();
    workspaceControllerMocks.useAppWorkspaceController.mockReset();
    presentationControllerMocks.useAppPresentationController.mockReset();
  });

  it('passes debug and workspace state to the presentation controller', () => {
    const workspaceController = {
      docType: 'images' as const,
      currentPage: 1,
    };
    const debugLogger = {
      debugEnabled: true,
      debugLogs: [],
      logDebug: vi.fn(),
    };
    const appShell = {
      headerProps: { id: 'header' },
      documentPreviewProps: { id: 'preview' },
      sidebarProps: { id: 'sidebar' },
      debugModalProps: { id: 'debug' },
      exportOverlayProps: { id: 'overlay' },
    };

    debugLoggerMocks.useDebugLogger.mockReturnValue(debugLogger);
    workspaceControllerMocks.useAppWorkspaceController.mockReturnValue(workspaceController);
    presentationControllerMocks.useAppPresentationController.mockReturnValue(appShell);

    const { result } = renderHook(() => useAppController());

    expect(workspaceControllerMocks.useAppWorkspaceController).toHaveBeenCalledWith({
      logDebug: debugLogger.logDebug,
    });
    expect(presentationControllerMocks.useAppPresentationController).toHaveBeenCalledWith({
      workspace: workspaceController,
      debugEnabled: true,
      debugLogs: [],
      logDebug: debugLogger.logDebug,
    });
    expect(result.current).toBe(appShell);
  });
});
