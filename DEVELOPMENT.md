# 開発ガイド

## プロジェクト概要

- 構成は `Vite + React 19 + TypeScript`
- 配布先は `GitHub Pages` の静的サイト
- 実行環境はブラウザのみで、サーバー処理はない
- 読み込んだファイルや編集結果はブラウザ内で扱い、テンプレートは `localStorage` に保存する
- プロジェクト保存は「論理ページ + カット配置 + 採番設定 + テンプレート状態」を保存し、素材自体は含めない

## 構成の見取り図

- `App.tsx`
  - 画面の shell と controller の接続を担当
- `hooks/useAppController.ts`
  - ワークスペース、入出力、デバッグ、表示 props の合成を担当
- `hooks/useDocumentViewer.ts`
  - PDF・画像の読み込み、ドラッグ＆ドロップ、ページ状態、EXIF回転補正を担当
- `hooks/useCurrentProjectSession.ts`
  - 現在素材に対する論理ページ session、Undo/Redo、採番状態同期を担当
- `hooks/useLoadedProjectSession.ts`
  - 保存済みプロジェクトの読込後編集、割当、Undo/Redo を担当
- `application/projectProjection.ts`
  - `Cut[]` と `ProjectDocument` の相互投影を担当
- `application/projectPresentation.ts`
  - `ProjectDocument` から `AppSettings` / `Template` への投影を担当
- `hooks/useTemplates.ts`
  - テンプレート編集と `localStorage` 永続化を担当
- `services/pdfService.ts`
  - PDF書き出しと、画像からのPDF生成、文字・白座布団描画を担当
- `services/imageExportService.ts`
  - 連番画像のZIP書き出しを担当
- `components/`
  - プレビュー表示と各種設定UIを担当

## 安全な初期セットアップ

1. まず最新化する  
   `git pull --ff-only origin main`
2. lockfile どおりに依存関係を入れる  
   `npm ci`
3. 変更前の基準状態を確認する  
   `npm run check`
4. 開発を始める  
   `npm run dev`

このリポでは `npm install` より `npm ci` を優先します。`package-lock.json` とローカル状態を揃えやすく、依存関係のズレを減らせます。

## 日常の開発手順

1. 最新の `main` から始める
2. 変更範囲はできるだけ責務の近い箇所に絞る
3. 依存関係を触ったら `package-lock.json` の差分を必ず確認する
4. 作業を渡す前、またはコミット前に `npm run check` を実行する
5. UIや書き出しに影響する変更では、下の回帰チェックを行う
6. プロジェクト保存や再適用に触る変更では、論理ページ割当の手動確認を行う

## 必須の確認コマンド

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`

まとめて確認する場合は `npm run check` を使います。開発完了時やデプロイ前の標準手順です。

## テスト運用

- 監視モードで回す  
  `npm run test`
- 1回だけ実行する  
  `npm run test:run`
- カバレッジ付きで実行する  
  `npm run test:coverage`

リファクタ前に守る対象として、現在は次を優先してテストしています。

- 連番・枝番・Undo / Redo・再採番
- テンプレート保存・上書き・復元
- キーボードショートカット
- 画像の DPI / EXIF 向き補正
- プレビュー上のクリック行スナップ判定
- 論理ページ保存、投影、素材割当

## 手動回帰チェック

変更した範囲に応じて必要な項目を確認します。

- ファイル読み込み
  - ヘッダーのボタンからPDFを開ける
  - ヘッダーのボタンから連番画像フォルダを開ける
  - PDFのドラッグ＆ドロップ読み込みができる
  - 画像またはフォルダのドラッグ＆ドロップ読み込みができる
- プレビュー表示
  - 初回の表示倍率が不自然でない
  - ページ移動ができる
  - 拡大縮小ができる
- 番号配置
  - クリック配置ができる
  - 基準線近傍クリックで行スナップできる
  - 行スナップボタンとキーボード `1` から `9` が動く
  - 既存番号のドラッグ移動が反映される
  - 削除、Undo、Redo が動く
- 連番ロジック
  - 3桁と4桁の切り替え
  - 自動進行のON/OFF
  - 枝番 `A`, `B`, ... の進行
  - 選択位置からの再採番
- テンプレート
  - ガイド線を動かせる
  - 行の均等配置が動く
  - 保存ができる
  - 既存テンプレートへの上書きが意図どおり動く
  - 削除ができる
  - リロード後もテンプレートが残る
- プロジェクト保存と差し替え
  - 現在素材からプロジェクト保存ができる
  - 保存済みプロジェクトを素材なしでも読める
  - ページ数不一致時に比較状態へ入れる
  - 論理ページと現在素材の手動割当ができる
  - 論理ページの追加・削除・移動ができる
  - 割当調整後に適用できる
  - 任意位置から再採番して export に反映される
- 書き出し
  - PDF入力からPDF書き出しができる
  - 画像入力からPDF書き出しができる
  - 画像入力からZIP書き出しができる
  - 文字サイズ、白フチ、白座布団の設定が反映される

## 依存関係とリリースのルール

- 依存関係の更新は、できるだけ単独の作業として扱う
- `npm audit fix` を実行したら、差分確認後に `npm run check` を再実行する
- `dist/` と `node_modules/` はコミットしない
- デプロイ前は次の順で確認する
  - `npm run check`
  - 最終差分の確認
  - `npm run deploy`

## デバッグメモ

- URL に `?debug=1` を付けるとデバッグパネルを開ける
- 読み込み、表示、書き出しまわりを変更したときはこのモードを使う
