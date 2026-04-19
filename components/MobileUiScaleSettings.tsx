import React from 'react';

interface MobileUiScaleSettingsProps {
  autoUiScale: number;
  userUiScale: number;
  effectiveUiScale: number;
  onChange: (next: number) => void;
  onReset: () => void;
}

export const MobileUiScaleSettings: React.FC<MobileUiScaleSettingsProps> = ({
  autoUiScale,
  userUiScale,
  effectiveUiScale,
  onChange,
  onReset,
}) => {
  const autoPercent = Math.round(autoUiScale * 100);
  const userPercent = Math.round(userUiScale * 100);
  const effectivePercent = Math.round(effectiveUiScale * 100);
  const isResetDisabled = Math.abs(userUiScale - 1) < 0.001;

  return (
    <section className="rounded-xl border border-sky-100 bg-sky-50/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            端末表示倍率
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            この端末だけの UI 密度です。ファイルやプロジェクトには保存されません。
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm">
          {effectivePercent}%
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>手動補正</span>
          <span>{userPercent}%</span>
        </div>
        <input
          type="range"
          min="0.70"
          max="2.00"
          step="0.01"
          value={userUiScale}
          onChange={(event) => onChange(Number.parseFloat(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-sky-200 accent-sky-600"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>自動 {autoPercent}% x 手動 {userPercent}%</span>
        <button
          type="button"
          onClick={onReset}
          disabled={isResetDisabled}
          className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-default disabled:border-slate-200 disabled:text-slate-400"
        >
          自動に戻す
        </button>
      </div>
    </section>
  );
};
