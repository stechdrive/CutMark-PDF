import { useMobileLayout } from './useMobileLayout';

export const useIsMobileLayout = () => {
  return useMobileLayout().isMobileUi;
};
