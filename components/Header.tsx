
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Download, RotateCcw, RotateCw, Layers, FolderOpen, ChevronDown } from 'lucide-react';
import { DocType } from '../types';

interface HeaderProps {
  docType: DocType | null;
  onPdfFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPdf: () => void;
  onExportImages: () => void;
  isExporting: boolean;
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  docType,
  onPdfFileChange,
  onFolderChange,
  onExportPdf,
  onExportImages,
  isExporting,
  mode,
  setMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute('webkitdirectory', '');
    folderInputRef.current.setAttribute('directory', '');
  }, []);

  return (
    <div className="bg-slate-800 text-white p-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Layers className="text-blue-400" />
          CutMark PDF
        </div>
        <div className="h-6 w-px bg-slate-600 mx-2" />
        
        <div className="flex gap-2">
            <button
            onClick={() => pdfInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            title="PDFファイルを開く"
            >
            <Upload size={16} /> PDF
            </button>
            <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onPdfFileChange}
            />

            <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            title="連番画像の入ったフォルダを開く"
            >
            <FolderOpen size={16} /> フォルダ
            </button>
            <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFolderChange}
            />
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
            枠設定
          </button>
        </div>

        <div className="relative">
            <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!docType || isExporting}
                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors shadow-sm"
            >
                <Download size={16} /> 保存 <ChevronDown size={14} />
            </button>
            
            {showExportMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 text-gray-800">
                        <button
                            onClick={() => { setShowExportMenu(false); onExportPdf(); }}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
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
                              title="連番画像モードでのみ利用可能です"
                          >
                              連番画像(ZIP)として書き出し
                          </button>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
