import { useState } from 'react';
import { useAppDocumentController } from './useAppDocumentController';
import { useAppEditorController } from './useAppEditorController';

type DebugLogData = unknown | (() => unknown);

interface UseAppWorkspaceControllerOptions {
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useAppWorkspaceController = ({
  logDebug,
}: UseAppWorkspaceControllerOptions) => {
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const documentState = useAppDocumentController();
  const editorState = useAppEditorController({
    documentState,
    setMode,
    logDebug,
  });

  return {
    mode,
    setMode,
    ...documentState,
    ...editorState,
  };
};

export type AppWorkspaceControllerState = ReturnType<typeof useAppWorkspaceController>;
