import React, { useEffect, useRef, useState } from 'react';
import { ListTree, SlidersHorizontal } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { useElementSize } from '../hooks/useElementSize';

type MobilePanel = 'project' | 'sidebar' | null;

interface MobileWorkspaceShellProps {
  mode: 'edit' | 'template';
  isCompact?: boolean;
  isTight?: boolean;
  documentPreview: React.ReactNode;
  sidebar: React.ReactNode;
  leftProjectPanel?: React.ReactNode;
}

export const MobileWorkspaceShell: React.FC<MobileWorkspaceShellProps> = ({
  mode,
  isCompact = false,
  isTight = false,
  documentPreview,
  sidebar,
  leftProjectPanel,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const [openPanel, setOpenPanel] = useState<MobilePanel>(null);
  const { height: dockHeight } = useElementSize(dockRef);

  const togglePanel = (panel: Exclude<MobilePanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--mobile-dock-h', `${dockHeight}px`);
  }, [dockHeight]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--mobile-dock-h');
    };
  }, []);

  const projectLabel = isTight ? '整理' : 'ページ整理';
  const sidebarLabel = mode === 'template'
    ? (isTight ? '用紙' : '用紙設定')
    : (isTight ? '番号' : '番号設定');
  const showLabels = !isCompact || isTight;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {documentPreview}

      <div
        ref={dockRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 safe-area-bottom"
      >
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
                aria-label="ページ整理"
              >
                <ListTree className="h-4 w-4" />
                {showLabels ? projectLabel : '整理'}
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
              aria-label={mode === 'template' ? '用紙設定' : '番号設定'}
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
          title={projectLabel}
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
