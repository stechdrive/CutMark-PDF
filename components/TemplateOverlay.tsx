import React from 'react';
import { Template } from '../types';

interface TemplateOverlayProps {
  template: Template;
  onChange: (template: Template) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export const TemplateOverlay: React.FC<TemplateOverlayProps> = ({
  template,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const handleXDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    // Simplified drag logic - in a real app would use a more robust hook
    // For this demo, we assume the parent container is the reference
    const parent = (e.target as HTMLElement).closest('.pdf-page-container');
    if (!parent) return;
    const pointerId = e.pointerId;

    const updateX = (clientX: number) => {
      const rect = parent.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange({ ...template, xPosition: x });
    };

    const pointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      updateX(ev.clientX);
    };
    const stop = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      onInteractionEnd?.();
    };

    onInteractionStart?.();
    e.currentTarget.setPointerCapture?.(pointerId);
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const handleYDrag = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    const parent = (e.target as HTMLElement).closest('.pdf-page-container');
    if (!parent) return;
    const pointerId = e.pointerId;

    const updateY = (clientY: number) => {
      const rect = parent.getBoundingClientRect();
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const newRows = [...template.rowPositions];
      newRows[index] = y;
      onChange({ ...template, rowPositions: newRows });
    };

    const pointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      updateY(ev.clientY);
    };
    const stop = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      onInteractionEnd?.();
    };

    onInteractionStart?.();
    e.currentTarget.setPointerCapture?.(pointerId);
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* X Axis Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-col-resize touch-none pointer-events-auto hover:w-1 hover:bg-red-400 transition-all"
        style={{ left: `${template.xPosition * 100}%` }}
        onPointerDown={handleXDrag}
      >
        <div
          className="absolute top-2 left-2 bg-red-600 text-white text-xs px-1 rounded whitespace-nowrap"
          title="カット番号の配置全体の中心がこの縦線に合う位置です。"
        >
          横位置 (配置の中心)
        </div>
      </div>

      {/* Y Axis Lines */}
      {template.rowPositions.map((y, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-0.5 bg-blue-500 cursor-row-resize touch-none pointer-events-auto hover:h-1 hover:bg-blue-400 transition-all"
          style={{ top: `${y * 100}%` }}
          onPointerDown={(e) => handleYDrag(i, e)}
        >
          <div
            className="absolute left-2 -top-6 bg-blue-600 text-white text-xs px-1 rounded flex items-center shadow-sm"
            title="カット番号の配置全体の上端がこの横線に合う位置です。"
          >
             行 {i + 1} (配置の上端)
          </div>
        </div>
      ))}
    </div>
  );
};
