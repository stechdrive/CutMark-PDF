
import React from 'react';
import { pdfjs } from 'react-pdf';

// Hooks
import { useAppController } from './hooks/useAppController';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentPreview } from './components/DocumentPreview';
import { ExportOverlay } from './components/ExportOverlay';
import { DebugModal } from './components/DebugModal';

// Worker setup: GH-Pages でもローカルのワーカーを利用する
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function App() {
  const {
    headerProps,
    leftProjectPanel,
    documentPreviewProps,
    sidebarProps,
    debugModalProps,
    exportOverlayProps,
  } = useAppController();

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
      <Header {...headerProps} />

      <div className="flex flex-1 overflow-hidden relative">
        <ExportOverlay {...exportOverlayProps} />
        {leftProjectPanel && (
          <aside className="w-96 shrink-0 border-r border-gray-200 bg-white shadow-xl z-20">
            <div className="h-full p-4">
              {leftProjectPanel}
            </div>
          </aside>
        )}
        <DocumentPreview {...documentPreviewProps} />
        <Sidebar {...sidebarProps} />
      </div>

      <DebugModal {...debugModalProps} />
    </div>
  );
}
