import React from 'react';
import { Cut, AppSettings } from '../types';
import { X } from 'lucide-react';

const POINTER_DRAG_SLOP_PX = 6;

interface CutMarkerProps {
  cut: Cut;
  settings: AppSettings;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const CutMarker: React.FC<CutMarkerProps> = ({
  cut,
  settings,
  isSelected,
  onSelect,
  onDelete,
  onUpdatePosition,
  onDragEnd,
  containerRef,
}) => {
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect(cut.id);

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const pointerId = e.pointerId;
    const pointerTarget = e.currentTarget;
    let isDragging = false;

    // Calculate initial mouse percentage relative to container
    const mouseX = (clientX - rect.left) / rect.width;
    const mouseY = (clientY - rect.top) / rect.height;

    // Maintain the offset between mouse and element anchor to avoid jumping
    const offsetX = cut.x - mouseX;
    const offsetY = cut.y - mouseY;

    const update = (cx: number, cy: number) => {
      const newMouseX = (cx - rect.left) / rect.width;
      const newMouseY = (cy - rect.top) / rect.height;
      
      const newX = Math.max(0, Math.min(1, newMouseX + offsetX));
      const newY = Math.max(0, Math.min(1, newMouseY + offsetY));
      
      onUpdatePosition(cut.id, newX, newY);
    };

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const movedDistance = Math.hypot(ev.clientX - clientX, ev.clientY - clientY);
      if (!isDragging && movedDistance < POINTER_DRAG_SLOP_PX) {
        return;
      }

      isDragging = true;
      ev.preventDefault(); // Prevent scrolling on mobile
      update(ev.clientX, ev.clientY);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      pointerTarget.removeEventListener('pointerup', handleUp);
      pointerTarget.removeEventListener('pointercancel', handleUp);
      pointerTarget.removeEventListener('lostpointercapture', handleLostPointerCapture);
      if (pointerTarget.hasPointerCapture?.(pointerId)) {
        pointerTarget.releasePointerCapture(pointerId);
      }
    };

    const handleUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      if (isDragging) {
        onDragEnd();
      }
    };

    const handleLostPointerCapture = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      if (isDragging) {
        onDragEnd();
      }
    };

    pointerTarget.setPointerCapture?.(pointerId);
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    pointerTarget.addEventListener('pointerup', handleUp);
    pointerTarget.addEventListener('pointercancel', handleUp);
    pointerTarget.addEventListener('lostpointercapture', handleLostPointerCapture);
  };

  return (
    <div
      className={`absolute flex items-start justify-start cursor-move touch-none group select-none transition-transform ${
        isSelected ? 'z-50 scale-110' : 'z-10'
      }`}
      style={{
        left: `${cut.x * 100}%`,
        top: `${cut.y * 100}%`,
        // X: Center (translateX -50%), Y: Top (no translate needed as top is 0)
        transform: 'translateX(-50%)', 
      }}
      onPointerDown={handleDragStart}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Background (Visual Simulation of the PDF output) */}
      <div
        className={`relative ${settings.useWhiteBackground ? 'bg-white' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          padding: `${settings.backgroundPadding}px`,
        }}
      >
        <span
          style={{
            fontSize: `${settings.fontSize}px`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 'bold',
            lineHeight: 1,
            display: 'block',
            whiteSpace: 'pre',
            textAlign: 'center',
            // White outline simulation for preview
            WebkitTextStroke: settings.textOutlineWidth > 0 ? `${settings.textOutlineWidth}px white` : 'none',
            paintOrder: 'stroke fill',
          }}
        >
          {cut.label}
        </span>

        {/* Delete Button (Visible on Hover/Select) */}
        {(isSelected) && (
          <button
            onPointerDown={(e) => {
               // Prevent drag start
               e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cut.id);
            }}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
