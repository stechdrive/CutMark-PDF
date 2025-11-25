
import React from 'react';
import { Cut, AppSettings } from '../types';
import { X } from 'lucide-react';

interface CutMarkerProps {
  cut: Cut;
  settings: AppSettings;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const CutMarker: React.FC<CutMarkerProps> = ({
  cut,
  settings,
  isSelected,
  onSelect,
  onDelete,
}) => {
  return (
    <div
      className={`absolute flex items-start justify-start cursor-move group select-none transition-transform ${
        isSelected ? 'z-50 scale-110' : 'z-10'
      }`}
      style={{
        left: `${cut.x * 100}%`,
        top: `${cut.y * 100}%`,
        // X: Center (translateX -50%), Y: Top (no translate needed as top is 0)
        transform: 'translateX(-50%)', 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cut.id);
      }}
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
