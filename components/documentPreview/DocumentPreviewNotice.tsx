import React from 'react';

interface DocumentPreviewNoticeProps {
  title: string;
  message: string;
}

export const DocumentPreviewNotice: React.FC<DocumentPreviewNoticeProps> = ({
  title,
  message,
}) => (
  <div className="pointer-events-none absolute top-4 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 px-4">
    <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-center shadow-lg backdrop-blur">
      <div className="text-sm font-semibold text-amber-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-amber-800">{message}</div>
    </div>
  </div>
);
