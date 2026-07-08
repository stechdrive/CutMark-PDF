import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type TauriConfig = {
  app?: {
    windows?: Array<{
      dragDropEnabled?: boolean;
      title?: string;
    }>;
  };
};

describe('Tauri desktop configuration', () => {
  it('lets WebView handle HTML5 drag and drop events', () => {
    const configPath = path.resolve(process.cwd(), 'src-tauri/tauri.conf.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TauriConfig;
    const windows = config.app?.windows ?? [];

    expect(windows.length).toBeGreaterThan(0);
    expect(windows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'CutMark PDF',
          dragDropEnabled: false,
        }),
      ])
    );
  });
});
