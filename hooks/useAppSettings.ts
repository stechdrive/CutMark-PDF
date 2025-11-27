import { useState, useCallback } from 'react';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 12,
  useWhiteBackground: false,
  backgroundPadding: 4,
  nextNumber: 1,
  branchChar: null,
  autoIncrement: true,
  minDigits: 3,
  textOutlineWidth: 2,
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const getNextLabel = useCallback((): string => {
    let numStr = settings.nextNumber.toString();
    numStr = numStr.padStart(settings.minDigits, '0');

    if (settings.branchChar) {
      return `${numStr}\n${settings.branchChar}`;
    }
    return numStr;
  }, [settings]);

  const incrementCounter = useCallback(() => {
    if (!settings.autoIncrement) return;

    if (settings.branchChar) {
      const nextChar = String.fromCharCode(settings.branchChar.charCodeAt(0) + 1);
      setSettings(s => ({ ...s, branchChar: nextChar }));
    } else {
      setSettings(s => ({ ...s, nextNumber: s.nextNumber + 1 }));
    }
  }, [settings]);

  return {
    settings,
    setSettings,
    getNextLabel,
    incrementCounter
  };
};