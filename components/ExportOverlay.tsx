import React from 'react';

interface ExportOverlayProps {
  isExporting: boolean;
}

export const ExportOverlay: React.FC<ExportOverlayProps> = ({ isExporting }) => {
  if (!isExporting) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white flex-col gap-2">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
      <div className="font-bold">書き出し処理中...</div>
      <div className="text-sm opacity-80">大量の画像の場合、時間がかかることがあります</div>
    </div>
  );
};
