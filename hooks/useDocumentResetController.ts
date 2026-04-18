import { useCallback, useRef } from 'react';

export const useDocumentResetController = () => {
  const resetHandlerRef = useRef<() => void>(() => {});

  const setResetHandler = useCallback((resetHandler?: () => void) => {
    resetHandlerRef.current = resetHandler ?? (() => {});
  }, []);

  const handleDocumentReset = useCallback(() => {
    resetHandlerRef.current();
  }, []);

  return {
    handleDocumentReset,
    setResetHandler,
  };
};
