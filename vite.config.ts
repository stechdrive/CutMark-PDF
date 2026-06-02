import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { normalizePath } from 'vite';
import { defineConfig } from 'vitest/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
) as { version?: string };

const appVersion = packageJson.version ?? '0.0.0';
const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const pdfjsCMapsDir = normalizePath(path.join(pdfjsDistPath, 'cmaps'));
const pdfjsStandardFontsDir = normalizePath(path.join(pdfjsDistPath, 'standard_fonts'));

export default defineConfig(({ mode }) => {
  const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM) || mode === 'tauri';
  const tauriDevHost = process.env.TAURI_DEV_HOST;

  return {
    base: isTauri ? './' : '/CutMark-PDF/',
    server: {
      port: 3000,
      strictPort: isTauri,
      host: tauriDevHost || '0.0.0.0',
      hmr: tauriDevHost
        ? {
            protocol: 'ws',
            host: tauriDevHost,
            port: 3000,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
      target: isTauri
        ? process.env.TAURI_ENV_PLATFORM === 'windows'
          ? 'chrome105'
          : 'safari13'
        : undefined,
      minify: isTauri && process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
      sourcemap: isTauri ? Boolean(process.env.TAURI_ENV_DEBUG) : false,
    },
    plugins: [
      react(),
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: normalizePath(path.join(pdfjsCMapsDir, '*')),
            dest: 'cmaps',
            rename: { stripBase: true },
          },
          {
            src: normalizePath(path.join(pdfjsStandardFontsDir, '*')),
            dest: 'standard_fonts',
            rename: { stripBase: true },
          },
        ],
      }),
    ],
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
          'adapters/**/*.ts',
          'application/**/*.ts',
          'components/**/*.tsx',
          'domain/**/*.ts',
          'hooks/**/*.ts',
          'hooks/**/*.tsx',
          'repositories/**/*.ts',
          'services/**/*.ts',
          'utils/**/*.ts',
        ],
      },
    },
  };
});
