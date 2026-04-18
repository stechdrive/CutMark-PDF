import React from 'react';

interface DebugModalProps {
  open: boolean;
  debugTextRef: React.RefObject<HTMLTextAreaElement | null>;
  debugReport: string;
  debugCopyStatus: 'idle' | 'copied' | 'failed';
  onClose: () => void;
  onCopy: () => void;
}

export const DebugModal: React.FC<DebugModalProps> = ({
  open,
  debugTextRef,
  debugReport,
  debugCopyStatus,
  onClose,
  onCopy,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="font-bold text-sm text-gray-800">デバッグログ</div>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            閉じる
          </button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            ref={debugTextRef}
            readOnly
            value={debugReport}
            className="w-full h-80 p-3 text-xs font-mono border border-gray-200 rounded bg-gray-50 text-gray-700"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              このログをコピーして共有してください
            </div>
            <div className="flex items-center gap-2">
              {debugCopyStatus === 'copied' && (
                <span className="text-xs text-green-600">コピーしました</span>
              )}
              {debugCopyStatus === 'failed' && (
                <span className="text-xs text-red-600">コピーできませんでした</span>
              )}
              <button
                onClick={onCopy}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
