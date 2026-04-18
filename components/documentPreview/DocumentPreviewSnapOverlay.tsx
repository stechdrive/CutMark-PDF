import React from 'react';
import { Template } from '../../types';

interface DocumentPreviewSnapOverlayProps {
  template: Template;
  snapTarget: {
    y: number;
    rowIndex: number;
  };
}

export const DocumentPreviewSnapOverlay: React.FC<DocumentPreviewSnapOverlayProps> = ({
  template,
  snapTarget,
}) => (
  <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
    <div
      className="absolute top-0 bottom-0 w-10 -translate-x-1/2 rounded-full border border-sky-400/50 bg-sky-300/15"
      style={{ left: `${template.xPosition * 100}%` }}
    />
    <div
      className="absolute left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
      style={{ top: `${snapTarget.y * 100}%` }}
    />
    <div
      className="absolute top-2 -translate-x-1/2 rounded-full bg-sky-600/95 px-2 py-0.5 text-[10px] font-medium text-white shadow"
      style={{ left: `${template.xPosition * 100}%` }}
    >
      自動スナップ
    </div>
  </div>
);
