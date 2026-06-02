import { isTauri } from '@tauri-apps/api/core';

export type RuntimeKind = 'web' | 'tauri';

export interface RuntimeEnvironment {
  kind: RuntimeKind;
  isDesktop: boolean;
}

export const getRuntimeEnvironment = (): RuntimeEnvironment => {
  const tauri = isTauri();

  return {
    kind: tauri ? 'tauri' : 'web',
    isDesktop: tauri,
  };
};

export const isTauriRuntime = () => getRuntimeEnvironment().kind === 'tauri';
