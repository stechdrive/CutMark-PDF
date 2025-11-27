import React, { useRef } from 'react';
import { Upload, Download, RotateCcw, RotateCw, Layers, Settings } from 'lucide-react';

interface HeaderProps {
  pdfFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pdfFile,
  onFileChange,
  onExport,
  mode,
  setMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-slate-800 text-white p-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Layers className="text-blue-400" />
          CutMark PDF
        </div>
        <div className="h-6 w-px bg-slate-600 mx-2" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          <Upload size={16} /> PDFを開く
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />

        {pdfFile && (
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
            枠設定
          </button>
        </div>

        <button
          onClick={onExport}
          disabled={!pdfFile}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors shadow-sm"
        >
          <Download size={16} /> 保存
        </button>
      </div>
    </div>
  );
};
