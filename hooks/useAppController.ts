import { useDebugLogger } from './useDebugLogger';
import { useAppWorkspaceController } from './useAppWorkspaceController';
import { useAppPresentationController } from './useAppPresentationController';

export const useAppController = () => {
  const {
    debugEnabled,
    debugLogs,
    logDebug,
  } = useDebugLogger();
  const workspace = useAppWorkspaceController({ logDebug });

  return useAppPresentationController({
    workspace,
    debugEnabled,
    debugLogs,
    logDebug,
  });
};
