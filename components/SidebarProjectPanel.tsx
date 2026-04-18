import React from 'react';
import {
  ProjectAssetComparisonRow,
  ProjectAssetComparisonSummary,
} from '../application/projectComparison';
import { ProjectAssetBindings } from '../application/projectBindings';
import { AssetHint } from '../domain/project';

interface SidebarProjectPanelProps {
  projectName: string;
  savedAt: string;
  comparison: ProjectAssetComparisonSummary;
  bindings: ProjectAssetBindings;
  assignedCount: number;
  currentAssets: Array<AssetHint | null | undefined>;
  canApplyProject: boolean;
  canResetBindings: boolean;
  onBindingChange: (logicalPageId: string, nextAssetIndex: number | null) => void;
  onResetBindings: () => void;
  onApplyProject: () => void;
}

const formatAssetLabel = (asset: AssetHint | null) => {
  if (!asset) return '未割当';
  if (asset.sourceKind === 'pdf-page') {
    return asset.pageNumber != null
      ? `${asset.sourceLabel} P${asset.pageNumber}`
      : asset.sourceLabel;
  }
  return asset.sourceLabel || '画像';
};

const formatRowStatus = (row: ProjectAssetComparisonRow) => {
  if (row.status === 'matched') return '一致';
  if (row.status === 'missing_asset') return '素材不足';
  return '要確認';
};

export const SidebarProjectPanel: React.FC<SidebarProjectPanelProps> = ({
  projectName,
  savedAt,
  comparison,
  bindings,
  assignedCount,
  currentAssets,
  canApplyProject,
  canResetBindings,
  onBindingChange,
  onResetBindings,
  onApplyProject,
}) => {
  const unresolvedRows = comparison.rows.filter((row) => row.status !== 'matched').slice(0, 5);
  const getAssignedAsset = (logicalPageId: string) => {
    const assetIndex = bindings[logicalPageId];
    if (assetIndex == null) return null;
    return currentAssets[assetIndex] ?? null;
  };
  const statusLabel =
    comparison.currentAssetCount < 1
      ? '素材未読込'
      : comparison.canApplyByPageCount
        ? 'ページ数一致'
        : 'ページ数不一致';
  const statusClassName =
    comparison.currentAssetCount < 1
      ? 'bg-slate-200 text-slate-700'
      : comparison.canApplyByPageCount
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-sky-700">読込中プロジェクト</div>
          <div className="text-sm font-bold text-slate-900 break-all">{projectName}</div>
          <div className="text-xs text-slate-500">
            保存: {new Date(savedAt).toLocaleString('ja-JP')}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">論理ページ</div>
          <div className="mt-1 text-base font-bold text-slate-900">{comparison.logicalPageCount}</div>
        </div>
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">現在の素材</div>
          <div className="mt-1 text-base font-bold text-slate-900">{comparison.currentAssetCount}</div>
        </div>
        <div className="rounded-lg bg-white/80 p-2">
          <div className="text-slate-500">割当済み</div>
          <div className="mt-1 text-base font-bold text-slate-900">
            {assignedCount}/{comparison.logicalPageCount}
          </div>
        </div>
      </div>

      <div className="text-xs leading-5 text-slate-600">
        {comparison.currentAssetCount < 1 && '次にPDFまたは画像を読み込むと、保存時の論理ページと現在の素材を比較できます。'}
        {comparison.currentAssetCount > 0 && comparison.canApplyByPageCount && (
          <>
            ページ数が一致しています。必要なら下で割当を入れ替えてから適用できます。
            {comparison.needsReviewCount > 0 &&
              ` ただし ${comparison.needsReviewCount} ページは素材名が変わっているため要確認です。`}
          </>
        )}
        {comparison.currentAssetCount > 0 && !comparison.canApplyByPageCount && (
          <>
            素材のページ数に差分があります。
            {comparison.missingAssetCount > 0 && ` ${comparison.missingAssetCount} ページ分の素材が不足しています。`}
            {comparison.extraAssetCount > 0 && ` 現在の素材に ${comparison.extraAssetCount} ページ分の余剰があります。`}
            {comparison.currentAssetCount >= comparison.logicalPageCount &&
              ' すべての論理ページをどこへ載せるか決めれば、現行UIへ反映できます。'}
          </>
        )}
      </div>

      {comparison.currentAssetCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700">論理ページの割当</div>
            {canResetBindings && (
              <button
                type="button"
                onClick={onResetBindings}
                className="text-[11px] font-medium text-sky-700 hover:text-sky-800"
              >
                自動候補に戻す
              </button>
            )}
          </div>
          <div className="space-y-2">
            {comparison.rows.map((row) => (
              <div key={row.logicalPageId} className="rounded-lg border border-sky-100 bg-white/80 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">論理P{row.pageNumber}</span>
                  <span className="text-slate-500">{formatRowStatus(row)}</span>
                </div>
                <div className="mt-1 text-slate-600">保存時: {formatAssetLabel(row.expectedAsset)}</div>
                <div className="text-slate-600">割当中: {formatAssetLabel(getAssignedAsset(row.logicalPageId))}</div>
                <label className="mt-2 block text-slate-500" htmlFor={`binding-${row.logicalPageId}`}>
                  現在の素材ページ
                </label>
                <select
                  id={`binding-${row.logicalPageId}`}
                  aria-label={`論理ページ ${row.pageNumber} の割当`}
                  value={bindings[row.logicalPageId] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    onBindingChange(
                      row.logicalPageId,
                      value === '' ? null : Number(value)
                    );
                  }}
                  className="mt-1 w-full rounded-md border border-sky-100 bg-white px-2 py-1.5 text-xs text-slate-700"
                >
                  <option value="">未割当</option>
                  {currentAssets.map((asset, index) => (
                    <option key={`${row.logicalPageId}-asset-${index}`} value={index}>
                      {`現在P${index + 1}: ${formatAssetLabel(asset ?? null)}`}
                    </option>
                  ))}
                </select>
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
        現在の素材へ割当どおりに適用
      </button>

      {(unresolvedRows.length > 0 || comparison.extraAssetCount > 0) && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">差分のあるページ</div>
          <div className="space-y-2">
            {unresolvedRows.map((row) => (
              <div key={row.logicalPageId} className="rounded-lg border border-sky-100 bg-white/80 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">P{row.pageNumber}</span>
                  <span className="text-slate-500">{formatRowStatus(row)}</span>
                </div>
                <div className="mt-1 text-slate-600">保存時: {formatAssetLabel(row.expectedAsset)}</div>
                <div className="text-slate-600">割当中: {formatAssetLabel(getAssignedAsset(row.logicalPageId))}</div>
              </div>
            ))}
            {comparison.extraAssetCount > 0 && (
              <div className="rounded-lg border border-sky-100 bg-white/80 p-2 text-xs text-slate-600">
                現在の素材に余分なページが {comparison.extraAssetCount} 件あります。
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
