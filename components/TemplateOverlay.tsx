import React from 'react';
import { Template } from '../types';

interface TemplateOverlayProps {
  template: Template;
  onChange: (template: Template) => void;
}

export const TemplateOverlay: React.FC<TemplateOverlayProps> = ({ template, onChange }) => {
  const handleXDrag = (e: React.MouseEvent | React.TouchEvent) => {
    // Simplified drag logic - in a real app would use a more robust hook
    // For this demo, we assume the parent container is the reference
    const parent = (e.target as HTMLElement).closest('.pdf-page-container');
    if (!parent) return;

    const updateX = (clientX: number) => {
      const rect = parent.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange({ ...template, xPosition: x });
    };

    const mouseMove = (ev: MouseEvent) => updateX(ev.clientX);
    const touchMove = (ev: TouchEvent) => updateX(ev.touches[0].clientX);
    const stop = () => {
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };

    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('touchmove', touchMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
  };

  const handleYDrag = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    const parent = (e.target as HTMLElement).closest('.pdf-page-container');
    if (!parent) return;

    const updateY = (clientY: number) => {
      const rect = parent.getBoundingClientRect();
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const newRows = [...template.rowPositions];
      newRows[index] = y;
      onChange({ ...template, rowPositions: newRows });
    };

    const mouseMove = (ev: MouseEvent) => updateY(ev.clientY);
    const touchMove = (ev: TouchEvent) => updateY(ev.touches[0].clientY);
    const stop = () => {
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };

    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('touchmove', touchMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* X Axis Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-col-resize pointer-events-auto hover:w-1 hover:bg-red-400 transition-all"
        style={{ left: `${template.xPosition * 100}%` }}
        onMouseDown={handleXDrag}
        onTouchStart={handleXDrag}
      >
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-1 rounded whitespace-nowrap">
          横位置 (中央基準)
        </div>
      </div>

      {/* Y Axis Lines */}
      {template.rowPositions.map((y, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-0.5 bg-blue-500 cursor-row-resize pointer-events-auto hover:h-1 hover:bg-blue-400 transition-all"
          style={{ top: `${y * 100}%` }}
          onMouseDown={(e) => handleYDrag(i, e)}
          onTouchStart={(e) => handleYDrag(i, e)}
        >
          <div className="absolute left-2 -top-6 bg-blue-600 text-white text-xs px-1 rounded flex items-center shadow-sm">
             行 {i + 1} (上基準)
          </div>
        </div>
      ))}
    </div>
  );
};