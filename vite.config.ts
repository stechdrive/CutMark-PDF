import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
});
