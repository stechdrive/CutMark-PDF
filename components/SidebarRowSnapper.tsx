import React from 'react';
import { Type } from 'lucide-react';
import { Template } from '../types';

interface SidebarRowSnapperProps {
  template: Template;
  pdfFile: File | null;
  mode: 'edit' | 'template';
  onRowSnap: (index: number) => void;
}

export const SidebarRowSnapper: React.FC<SidebarRowSnapperProps> = ({
  template,
  pdfFile,
  mode,
  onRowSnap,
}) => {
  return (
    <div className="p-4 border-t border-gray-200 bg-slate-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative">
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
        <Type size={14} /> 行スナップ入力
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: template.rowCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => onRowSnap(i)}
            disabled={!pdfFile || mode === 'template'}
            className="h-12 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-md font-bold text-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="text-xs text-center text-gray-400 mt-2">
        キーボードの 1〜{template.rowCount} でも入力可能
      </p>
    </div>
  );
};