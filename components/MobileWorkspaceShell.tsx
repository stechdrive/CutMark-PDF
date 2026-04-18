import React, { useState } from 'react';
import { ListTree, SlidersHorizontal } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

type MobilePanel = 'project' | 'sidebar' | null;

interface MobileWorkspaceShellProps {
  mode: 'edit' | 'template';
  documentPreview: React.ReactNode;
  sidebar: React.ReactNode;
  leftProjectPanel?: React.ReactNode;
}

export const MobileWorkspaceShell: React.FC<MobileWorkspaceShellProps> = ({
  mode,
  documentPreview,
  sidebar,
  leftProjectPanel,
}) => {
  const [openPanel, setOpenPanel] = useState<MobilePanel>(null);

  const togglePanel = (panel: Exclude<MobilePanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const sidebarLabel = mode === 'template' ? '用紙設定' : '番号設定';

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {documentPreview}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur">
          <div className={`grid gap-2 ${leftProjectPanel ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {leftProjectPanel && (
              <button
                type="button"
                onClick={() => togglePanel('project')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  openPanel === 'project'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ListTree className="h-4 w-4" />
                ページ整理
              </button>
            )}

            <button
              type="button"
              onClick={() => togglePanel('sidebar')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                openPanel === 'sidebar'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {sidebarLabel}
            </button>
          </div>
        </div>
      </div>

      {leftProjectPanel && (
        <MobileBottomSheet
          open={openPanel === 'project'}
          title="ページ整理"
          onClose={() => setOpenPanel(null)}
        >
          <div className="h-full p-3">{leftProjectPanel}</div>
        </MobileBottomSheet>
      )}

      <MobileBottomSheet
        open={openPanel === 'sidebar'}
        title={sidebarLabel}
        onClose={() => setOpenPanel(null)}
      >
        {sidebar}
      </MobileBottomSheet>
    </div>
  );
};
