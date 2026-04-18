import fs from 'node:fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
) as { version?: string };

const appVersion = packageJson.version ?? '0.0.0';

export default defineConfig({
  // ★ GitHub Pages 用のベースパス（リポジトリ名と完全一致）
  base: '/CutMark-PDF/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    // package.json の version をアプリに注入
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'application/**/*.ts',
        'components/**/*.tsx',
        'domain/**/*.ts',
        'hooks/**/*.ts',
        'hooks/**/*.tsx',
        'services/**/*.ts',
        'utils/**/*.ts',
      ],
    },
  },
});
