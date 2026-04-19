
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
import { MobileWorkspaceShell } from './components/MobileWorkspaceShell';
import { useMobileLayout } from './hooks/useMobileLayout';
import { useViewportHeight } from './hooks/useViewportHeight';

// Worker setup: GH-Pages でもローカルのワーカーを利用する
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function App() {
  useViewportHeight();
  const mobileLayout = useMobileLayout();
  const {
    headerProps,
    leftProjectPanel,
    documentPreviewProps,
    sidebarProps,
    debugModalProps,
    exportOverlayProps,
  } = useAppController();

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden bg-gray-100 text-gray-800 font-sans"
      style={{ height: 'var(--app-height)' }}
    >
      <Header
        {...headerProps}
        isMobileUi={mobileLayout.isMobileUi}
        isMobileCompact={mobileLayout.isMobileCompact}
        isMobileTight={mobileLayout.isMobileTight}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ExportOverlay {...exportOverlayProps} />
        {mobileLayout.isMobileUi ? (
          <MobileWorkspaceShell
            mode={headerProps.mode}
            isCompact={mobileLayout.isMobileCompact}
            isTight={mobileLayout.isMobileTight}
            leftProjectPanel={leftProjectPanel}
            documentPreview={
              <DocumentPreview
                {...documentPreviewProps}
                layoutMode="mobile"
              />
            }
            sidebar={
              <Sidebar
                {...sidebarProps}
                layout="mobile"
                mobileAutoUiScale={mobileLayout.autoUiScale}
                mobileUserUiScale={mobileLayout.userUiScale}
                mobileEffectiveUiScale={mobileLayout.uiScale}
                onMobileUiScaleChange={mobileLayout.setUserUiScale}
                onResetMobileUiScale={mobileLayout.resetUserUiScale}
              />
            }
          />
        ) : (
          <>
            {leftProjectPanel && (
              <aside className="w-96 shrink-0 border-r border-gray-200 bg-white shadow-xl z-20">
                <div className="h-full p-4">
                  {leftProjectPanel}
                </div>
              </aside>
            )}
            <DocumentPreview {...documentPreviewProps} layoutMode="desktop" />
            <Sidebar {...sidebarProps} layout="desktop" />
          </>
        )}
      </div>

      <DebugModal {...debugModalProps} />
    </div>
  );
}
