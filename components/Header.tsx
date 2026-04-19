import React, { useRef, useState, useEffect } from 'react';
import { Upload, RotateCcw, RotateCw, ChevronDown, Save } from 'lucide-react';
import { DocType } from '../types';
import { useElementSize } from '../hooks/useElementSize';

const MOBILE_HEADER_COMPACT_WIDTH = 780;
const MOBILE_HEADER_TIGHT_WIDTH = 620;

interface HeaderProps {
  docType: DocType | null;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPdf: () => void;
  onExportImages: () => void;
  includeProjectFileOnExport: boolean;
  onToggleIncludeProjectFileOnExport: (next: boolean) => void;
  isExporting: boolean;
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenDebug?: () => void;
  showDebug?: boolean;
  isMobileUi?: boolean;
  isMobileCompact?: boolean;
  isMobileTight?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  docType,
  onImportFileChange,
  onExportPdf,
  onExportImages,
  includeProjectFileOnExport,
  onToggleIncludeProjectFileOnExport,
  isExporting,
  mode,
  setMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenDebug,
  showDebug = false,
  isMobileUi = false,
  isMobileCompact = false,
  isMobileTight = false,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { width: barWidth } = useElementSize(barRef);
  const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`;
  const isCompact =
    isMobileUi &&
    (isMobileCompact || (barWidth > 0 && barWidth < MOBILE_HEADER_COMPACT_WIDTH));
  const isTight =
    isMobileUi &&
    (isMobileTight || (barWidth > 0 && barWidth < MOBILE_HEADER_TIGHT_WIDTH));
  const editLabel = '番号';
  const templateLabel = '用紙';
  const exportMenuStyle = {
    width: isMobileUi ? 'min(18rem, calc(100vw - 1.5rem))' : '18rem',
  };

  useEffect(() => {
    if (!showExportMenu) return;

    const handleWindowClick = () => setShowExportMenu(false);
    window.addEventListener('click', handleWindowClick);

    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, [showExportMenu]);

  const importInput = (
    <input
      ref={importInputRef}
      type="file"
      accept=".pdf,.cutmark,.json,.jpg,.jpeg,.png,image/*,application/json"
      multiple
      className="hidden"
      onChange={onImportFileChange}
    />
  );

  const exportMenu = (
    <div
      className="absolute right-0 mt-2 rounded-md bg-white py-1 text-gray-800 shadow-lg z-20"
      style={exportMenuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm hover:bg-gray-50">
        <input
          type="checkbox"
          checked={includeProjectFileOnExport}
          onChange={(event) => onToggleIncludeProjectFileOnExport(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="space-y-1">
          <span className="block font-medium text-slate-800">
            プロジェクトファイル保存
          </span>
          <span className="block text-xs leading-5 text-slate-500">
            カット番号振り直し用データも一緒に書き出し
          </span>
        </span>
      </label>
      <div className="mx-2 border-t border-gray-100" />
      <button
        onClick={() => { setShowExportMenu(false); onExportPdf(); }}
        disabled={!docType}
        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        PDFとして書き出し
      </button>
      {docType === 'images' ? (
        <button
          onClick={() => { setShowExportMenu(false); onExportImages(); }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          連番画像(ZIP)として書き出し
        </button>
      ) : (
        <button
          disabled
          className="block w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
          title="連番画像の書き出しは画像読み込み時のみ利用できます"
        >
          連番画像(ZIP)として書き出し
        </button>
      )}
    </div>
  );

  if (isMobileUi) {
    return (
      <div className="safe-area-top z-50 bg-slate-800 text-white shadow-md">
        <div ref={barRef} className="flex items-center gap-2 px-2.5 pb-2.5 pt-3">
          <div className="flex shrink-0 items-center gap-2 font-bold text-base">
            <img src={logoUrl} alt="CutMark PDF" className="h-6 w-6 shrink-0" />
            {!isCompact && !isTight && <span className="truncate text-sm">CutMark PDF</span>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex rounded-xl bg-slate-700 p-1">
              <button
                onClick={() => setMode('edit')}
                className={`flex-1 rounded-lg px-2.5 py-1.5 transition-colors ${
                  mode === 'edit'
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-slate-300 hover:text-white'
                } ${isTight ? 'text-xs' : 'text-sm'}`}
              >
                {editLabel}
              </button>
              <button
                onClick={() => setMode('template')}
                className={`flex-1 rounded-lg px-2.5 py-1.5 transition-colors ${
                  mode === 'template'
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-slate-300 hover:text-white'
                } ${isTight ? 'text-xs' : 'text-sm'}`}
              >
                {templateLabel}
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isExporting}
              aria-label="読み込み"
              className="inline-flex items-center justify-center rounded-xl bg-slate-700 px-2.5 text-sm transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ minHeight: 'var(--header-action-h)' }}
              title="PDF、連番画像、プロジェクトファイルを読み込む"
            >
              <Upload size={18} />
            </button>
            {importInput}

            {docType && (
              <div className="flex items-center gap-0.5 rounded-xl bg-slate-700/80 p-0.5">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="rounded-lg p-1.5 transition-colors hover:bg-slate-600 disabled:opacity-30"
                  title="元に戻す (Ctrl+Z)"
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="rounded-lg p-1.5 transition-colors hover:bg-slate-600 disabled:opacity-30"
                  title="やり直す (Ctrl+Shift+Z)"
                >
                  <RotateCw size={17} />
                </button>
              </div>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu((current) => !current);
                }}
                disabled={!docType || isExporting}
                className={`inline-flex items-center rounded-xl bg-green-600 font-medium transition-colors shadow-sm hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 ${
                  isTight ? 'gap-1 px-2.5 text-xs' : 'gap-1.5 px-3 text-sm'
                }`}
                style={{ minHeight: 'var(--header-action-h)' }}
                title={
                  docType
                    ? 'PDFまたは連番画像を書き出します。必要ならプロジェクトファイルも一緒に保存できます'
                    : '先にPDFまたは画像を読み込んでください'
                }
              >
                <Save size={17} />
                <span>保存</span>
                {!isCompact && <ChevronDown size={13} />}
              </button>

              {showExportMenu && exportMenu}
            </div>

            {showDebug && onOpenDebug && !isCompact && (
              <button
                onClick={onOpenDebug}
                className="rounded-xl bg-slate-700 px-2.5 text-[11px] text-slate-200 transition-colors hover:bg-slate-600"
                style={{ minHeight: 'var(--header-action-h)' }}
              >
                デバッグ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className="bg-slate-800 text-white p-3 flex items-center justify-between shadow-md z-50"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <img src={logoUrl} alt="CutMark PDF" className="h-6 w-6" />
          CutMark PDF
        </div>
        <div className="h-6 w-px bg-slate-600 mx-2" />
        
        <div className="flex gap-2">
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="PDF、連番画像、プロジェクトファイルを読み込む"
          >
            <Upload size={16} /> 読み込み
          </button>
          {importInput}
        </div>

        {docType && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30"
              title="元に戻す (Ctrl+Z)"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30"
              title="やり直す (Ctrl+Shift+Z)"
            >
              <RotateCw size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              mode === 'edit'
                ? 'bg-blue-500 text-white font-medium'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            番号入力
          </button>
          <button
            onClick={() => setMode('template')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              mode === 'template'
                ? 'bg-orange-500 text-white font-medium'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            コンテ用紙設定
          </button>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExportMenu((current) => !current);
            }}
            disabled={!docType || isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors shadow-sm"
            title={
              docType
                ? 'PDFまたは連番画像を書き出します。必要ならプロジェクトファイルも一緒に保存できます'
                : '先にPDFまたは画像を読み込んでください'
            }
          >
            <Save size={16} /> 保存 <ChevronDown size={14} />
          </button>

          {showExportMenu && exportMenu}
        </div>
        {showDebug && onOpenDebug && (
          <button
            onClick={onOpenDebug}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors"
          >
            デバッグ
          </button>
        )}
      </div>
    </div>
  );
};
