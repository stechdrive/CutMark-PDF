import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentPreviewHudProps {
  isMobileLayout: boolean;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  currentPage: number;
  numPages: number;
  setCurrentPage: (num: number) => void;
}

export const DocumentPreviewHud: React.FC<DocumentPreviewHudProps> = ({
  isMobileLayout,
  scale,
  setScale,
  currentPage,
  numPages,
  setCurrentPage,
}) => (
  <>
    <div
      className={`absolute z-40 flex border border-gray-200 bg-white shadow-lg ${
        isMobileLayout
          ? 'bottom-24 left-3 gap-1.5 rounded-xl p-1.5'
          : 'bottom-6 left-6 gap-2 rounded-lg p-2'
      }`}
    >
      <button
        onClick={() => setScale((s) => Math.max(0.1, s - 0.1))}
        className="p-2 hover:bg-gray-100 rounded"
      >
        <ZoomOut size={20} />
      </button>
      <span className={`flex items-center justify-center font-mono text-sm ${isMobileLayout ? 'w-10' : 'w-12'}`}>
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={() => setScale((s) => Math.min(3, s + 0.1))}
        className="p-2 hover:bg-gray-100 rounded"
      >
        <ZoomIn size={20} />
      </button>
    </div>

    <div
      className={`fixed left-1/2 z-40 flex -translate-x-1/2 flex-col items-center ${
        isMobileLayout ? 'bottom-20 gap-1.5' : 'bottom-4 gap-2'
      }`}
    >
      <div
        className={`flex items-center gap-4 rounded-full bg-slate-800 text-white shadow-xl ${
          isMobileLayout ? 'px-3 py-1.5' : 'px-4 py-2'
        }`}
      >
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
        >
          <ChevronLeft />
        </button>
        <span className="font-medium whitespace-nowrap">
          Page {currentPage} / {numPages}
        </span>
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
        >
          <ChevronRight />
        </button>
      </div>
      <span className="hidden rounded border border-gray-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm backdrop-blur md:block">
        ホイールでページ移動 / 中ドラッグでパン
      </span>
    </div>
  </>
);
