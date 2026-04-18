import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { ProjectConteOrganizerSummary } from '../application/projectOrganizer';
import { AssetHint } from '../domain/project';

export interface ProjectOrganizerPanelProps {
  projectName: string;
  savedAt: string;
  selectedLogicalPageId: string | null;
  currentContePage: number | null;
  organizer: ProjectConteOrganizerSummary;
  canApplyProject: boolean;
  canResetBindings: boolean;
  canUndoDraft: boolean;
  canRedoDraft: boolean;
  onSelectLogicalPage: (logicalPageId: string) => void;
  onSelectContePage: (assetIndex: number, logicalPageId: string | null) => void;
  onInsertBlankPageAtAsset: (assetIndex: number) => void;
  onRemoveLogicalPageFromConte: (logicalPageId: string) => void;
  onUnassignLogicalPage: (logicalPageId: string) => void;
  onMoveLogicalPageToAsset: (logicalPageId: string, assetIndex: number) => void;
  onResetBindings: () => void;
  onUndoDraft: () => void;
  onRedoDraft: () => void;
  onApplyProject: () => void;
}

const formatAssetLabel = (asset: AssetHint | null) => {
  if (!asset) return '未読込';
  if (asset.sourceKind === 'pdf-page') {
    return asset.pageNumber != null
      ? `${asset.sourceLabel} P${asset.pageNumber}`
      : asset.sourceLabel;
  }
  return asset.sourceLabel || '画像';
};

const getStatusLabel = (status: ProjectConteOrganizerSummary['slots'][number]['status']) => {
  if (status === 'matched') return '一致';
  if (status === 'needs_review') return '自動割付';
  return '未割付';
};

const getStatusClassName = (status: ProjectConteOrganizerSummary['slots'][number]['status']) => {
  if (status === 'matched') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'needs_review') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const getPageChipClassName = (
  status: ProjectConteOrganizerSummary['slots'][number]['status'],
  isSelected: boolean
) => {
  if (isSelected) {
    return 'border-sky-400 bg-sky-100 text-sky-900 shadow-sm';
  }
  if (status === 'matched') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
  if (status === 'needs_review') {
    return 'border-sky-200 bg-sky-50 text-sky-900';
  }
  return 'border-dashed border-slate-300 bg-slate-50 text-slate-500';
};

export const ProjectOrganizerPanel: React.FC<ProjectOrganizerPanelProps> = ({
  projectName,
  savedAt,
  selectedLogicalPageId,
  currentContePage,
  organizer,
  canApplyProject,
  canResetBindings,
  canUndoDraft,
  canRedoDraft,
  onSelectLogicalPage,
  onSelectContePage,
  onInsertBlankPageAtAsset,
  onRemoveLogicalPageFromConte,
  onUnassignLogicalPage,
  onMoveLogicalPageToAsset,
  onResetBindings,
  onUndoDraft,
  onRedoDraft,
  onApplyProject,
}) => {
  const [draggedLogicalPageId, setDraggedLogicalPageId] = useState<string | null>(null);
  const [dragOverAssetIndex, setDragOverAssetIndex] = useState<number | null>(null);
  const [deleteMenuLogicalPageId, setDeleteMenuLogicalPageId] = useState<string | null>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedLogicalPageId) return;
    pageRefs.current[selectedLogicalPageId]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedLogicalPageId]);

  useEffect(() => {
    if (!deleteMenuLogicalPageId) return;

    const handleWindowClick = () => setDeleteMenuLogicalPageId(null);
    window.addEventListener('click', handleWindowClick);

    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, [deleteMenuLogicalPageId]);

  const statusLabel = useMemo(() => {
    if (organizer.contePageCount < 1) return 'コンテ未読込';
    if (organizer.unassignedConteCount > 0 || organizer.unplacedLogicalPageCount > 0) {
      return '調整中';
    }
    if (organizer.needsReviewCount > 0) {
      return '自動割付あり';
    }
    return '準備完了';
  }, [
    organizer.contePageCount,
    organizer.needsReviewCount,
    organizer.unassignedConteCount,
    organizer.unplacedLogicalPageCount,
  ]);

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-sky-700">読込中プロジェクト</div>
          <div className="text-sm font-bold text-slate-900 break-all">{projectName}</div>
          <div className="text-xs text-slate-500">
            保存: {new Date(savedAt).toLocaleString('ja-JP')}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">カット番号ページ</div>
          <div className="mt-1 text-base font-bold text-slate-900">{organizer.logicalPageCount}</div>
        </div>
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">コンテ</div>
          <div className="mt-1 text-base font-bold text-slate-900">{organizer.contePageCount}</div>
        </div>
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">割付済み</div>
          <div className="mt-1 text-base font-bold text-slate-900">
            {organizer.assignedCount}/{organizer.contePageCount}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600">
        コンテ順でカット番号ページを整理します。上段をドラッグすると差し込み移動、空欄挿入で後ろをずらせます。
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndoDraft}
            disabled={!canUndoDraft}
            className="rounded border border-sky-100 px-2 py-1 text-[11px] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedoDraft}
            disabled={!canRedoDraft}
            className="rounded border border-sky-100 px-2 py-1 text-[11px] text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>
        </div>
        {canResetBindings && (
          <button
            type="button"
            onClick={onResetBindings}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            保存情報から自動割付
          </button>
        )}
      </div>

      {organizer.contePageCount > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700">コンテ順のページ整理</div>
          <div className="space-y-3">
            {organizer.slots.map((slot) => (
              (() => {
                const isActiveContePage = currentContePage === slot.contePageNumber;

                return (
                  <div
                    key={`conte-slot-${slot.assetIndex}`}
                    className={`relative overflow-hidden rounded-xl border p-3 transition-colors ${
                      dragOverAssetIndex === slot.assetIndex
                        ? 'border-sky-400 bg-sky-100/70'
                        : isActiveContePage
                          ? 'border-sky-300 bg-sky-50/90 ring-1 ring-sky-200 shadow-sm'
                          : 'border-sky-100 bg-white/80'
                    }`}
                    onClick={() => onSelectContePage(slot.assetIndex, slot.logicalPageId)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!draggedLogicalPageId) return;
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverAssetIndex(slot.assetIndex);
                    }}
                    onDragLeave={() => {
                      setDragOverAssetIndex((current) =>
                        current === slot.assetIndex ? null : current
                      );
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedLogicalPageId) return;
                      onMoveLogicalPageToAsset(draggedLogicalPageId, slot.assetIndex);
                      setDraggedLogicalPageId(null);
                      setDragOverAssetIndex(null);
                    }}
                  >
                    {isActiveContePage && (
                      <div className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-sky-500" />
                    )}
                <div className="flex items-start justify-between gap-2">
                  <div
                    ref={(element) => {
                      if (slot.logicalPageId) {
                        pageRefs.current[slot.logicalPageId] = element;
                      }
                    }}
                    draggable={!!slot.logicalPageId}
                    onDragStart={(event) => {
                      if (!slot.logicalPageId) return;
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedLogicalPageId(slot.logicalPageId);
                    }}
                    onDragEnd={() => {
                      setDraggedLogicalPageId(null);
                      setDragOverAssetIndex(null);
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      getPageChipClassName(slot.status, slot.isSelected)
                    } ${slot.logicalPageId ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    {slot.logicalPageId ? (
                      <GripVertical className="h-4 w-4 shrink-0 text-current/70" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border border-current/30" />
                    )}
                    <button
                      type="button"
                      disabled={!slot.logicalPageId}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (slot.logicalPageId) {
                          onSelectLogicalPage(slot.logicalPageId);
                          onSelectContePage(slot.assetIndex, slot.logicalPageId);
                        }
                      }}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <div className="truncate text-sm font-semibold">
                        {slot.logicalPageNumber != null
                          ? `カット番号P${slot.logicalPageNumber}`
                          : '未割付'}
                      </div>
                      <div className="truncate text-[11px] text-current/75">
                        {slot.logicalPageId
                          ? `${slot.cutCount} カット`
                          : 'ここにドラッグして割り付け'}
                      </div>
                    </button>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClassName(slot.status)}`}
                    >
                      {getStatusLabel(slot.status)}
                    </span>
                  </div>

                  <div className="relative flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onInsertBlankPageAtAsset(slot.assetIndex);
                      }}
                      aria-label={`コンテP${slot.contePageNumber} に空欄を挿入`}
                      className="rounded border border-sky-100 p-1.5 text-slate-600 hover:bg-sky-50"
                      title="ここに空欄ページを挿入"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteMenuLogicalPageId((current) =>
                          current === slot.logicalPageId ? null : slot.logicalPageId
                        );
                      }}
                      disabled={!slot.logicalPageId || organizer.logicalPageCount <= 1}
                      aria-label={`カット番号ページの削除方法を選ぶ ${slot.contePageNumber}`}
                      className="inline-flex items-center gap-1 rounded border border-sky-100 px-1.5 py-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title="このカット番号ページの削除方法を選ぶ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {slot.logicalPageId && deleteMenuLogicalPageId === slot.logicalPageId && (
                      <div
                        className="absolute right-0 top-full z-20 mt-2 w-44 rounded-md border border-sky-100 bg-white py-1 text-xs text-slate-700 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveLogicalPageFromConte(slot.logicalPageId);
                            setDeleteMenuLogicalPageId(null);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                        >
                          削除して後ろを詰める
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUnassignLogicalPage(slot.logicalPageId);
                            setDeleteMenuLogicalPageId(null);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                        >
                          未割付にする
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectContePage(slot.assetIndex, slot.logicalPageId);
                  }}
                  className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs text-slate-600 hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <div className="font-semibold text-slate-700">コンテP{slot.contePageNumber}</div>
                  <div className="mt-1 break-all">{formatAssetLabel(slot.asset)}</div>
                  {slot.logicalPage && slot.expectedAsset && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      保存時: {formatAssetLabel(slot.expectedAsset)}
                    </div>
                  )}
                </button>
                  </div>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {organizer.unplacedPages.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">未配置のカット番号ページ</div>
          <div className="space-y-2">
            {organizer.unplacedPages.map((page) => (
              <div
                key={page.logicalPageId}
                ref={(element) => {
                  pageRefs.current[page.logicalPageId] = element;
                }}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggedLogicalPageId(page.logicalPageId);
                }}
                onDragEnd={() => {
                  setDraggedLogicalPageId(null);
                  setDragOverAssetIndex(null);
                }}
                className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 transition-colors active:cursor-grabbing ${
                  page.isSelected
                    ? 'border-sky-400 bg-sky-100/70'
                    : 'border-slate-200 bg-white/80'
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                <button
                  type="button"
                  onClick={() => onSelectLogicalPage(page.logicalPageId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {`カット番号P${page.logicalPageNumber}`}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {`${page.cutCount} カット`}
                    {page.expectedAsset ? ` / 保存時: ${formatAssetLabel(page.expectedAsset)}` : ''}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLogicalPageFromConte(page.logicalPageId)}
                  disabled={organizer.logicalPageCount <= 1}
                  aria-label={`未配置のカット番号ページを削除 ${page.logicalPageNumber}`}
                  className="shrink-0 rounded border border-sky-100 p-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="この未配置のカット番号ページを削除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onApplyProject}
        disabled={!canApplyProject}
        className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        この割付を編集に反映
      </button>
    </section>
  );
};
