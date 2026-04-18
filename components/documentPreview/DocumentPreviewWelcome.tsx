import React from 'react';
import { Upload } from 'lucide-react';

interface DocumentPreviewWelcomeProps {
  isDragging: boolean;
}

export const DocumentPreviewWelcome: React.FC<DocumentPreviewWelcomeProps> = ({
  isDragging,
}) => (
  <div
    className={`m-auto text-center ${
      isDragging ? 'text-blue-500' : 'text-gray-400'
    }`}
  >
    <Upload
      size={64}
      className={`mx-auto mb-4 ${
        isDragging ? 'opacity-100 scale-110' : 'opacity-50'
      } transition-all`}
    />
    <p className="text-xl">
      {isDragging
        ? 'ここにドロップして開く'
        : (
          <>
            ファイルや画像フォルダをドラッグ＆ドロップ<br />
            または「読み込み」から PDF / 連番画像 / プロジェクトファイル を選んでください
          </>
        )}
    </p>
    <p className="mt-2 text-sm text-gray-500">
      プロジェクトファイルも、PDF や連番画像とまとめてドロップできます
    </p>
    <p className="mt-4 text-xs text-gray-500">
      データはブラウザ内だけで処理されサーバーには送信されません
    </p>
  </div>
);
