import React from 'react';
import { Settings } from 'lucide-react';
import { AppSettings, NumberingState } from '../types';

interface SidebarNumberingSettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setNumberingState: (next: NumberingState) => void;
  selectedCutId: string | null;
  onRenumberFromSelected: (cutId: string) => void;
}

export const SidebarNumberingSettings: React.FC<SidebarNumberingSettingsProps> = ({
  settings,
  setSettings,
  setNumberingState,
  selectedCutId,
  onRenumberFromSelected,
}) => {
  const canRenumber = !!selectedCutId;

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Settings size={16} /> 番号設定
      </h3>

      <div className="space-y-2.5 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-600">配置する番号</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.nextNumber}
              onChange={(e) =>
                setNumberingState({
                  nextNumber: parseInt(e.target.value) || 1,
                  branchChar: settings.branchChar,
                })
              }
              className="w-16 p-1 text-right border rounded text-lg font-bold"
            />
          </div>
        </div>

        {/* Digit Count Selector */}
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-600">桁数</label>
          <div className="flex bg-gray-200 rounded p-0.5">
            <button
              onClick={() => setSettings({ ...settings, minDigits: 3 })}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                settings.minDigits === 3
                  ? 'bg-white shadow text-gray-800 font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              3桁
            </button>
            <button
              onClick={() => setSettings({ ...settings, minDigits: 4 })}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                settings.minDigits === 4
                  ? 'bg-white shadow text-gray-800 font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              4桁
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">A-B分け</label>
          <button
            onClick={() => {
              if (settings.branchChar) {
                // Turn off, increment parent
                setNumberingState({
                  nextNumber: settings.nextNumber + 1,
                  branchChar: null,
                });
              } else {
                // Turn on
                setNumberingState({
                  nextNumber: settings.nextNumber,
                  branchChar: 'A',
                });
              }
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              settings.branchChar
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {settings.branchChar ? `ON (${settings.branchChar})` : 'OFF'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoIncrement}
            onChange={(e) =>
              setSettings({ ...settings, autoIncrement: e.target.checked })
            }
            className="rounded text-blue-500"
          />
          入力時に自動進行する
        </label>

        <label
          className="flex items-center justify-between gap-3 cursor-pointer"
          title="コンテ用紙設定で指定したカット番号列の近くをクリックすると、その行に合わせて自動配置します。"
        >
          <span
            className="text-sm text-gray-700"
            title="コンテ用紙設定で指定したカット番号列の近くをクリックすると、その行に合わせて自動配置します。"
          >
            カット番号をスナップ配置
          </span>
          <div
            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
              settings.enableClickSnapToRows ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                settings.enableClickSnapToRows ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
            <input
              type="checkbox"
              className="hidden"
              checked={settings.enableClickSnapToRows}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  enableClickSnapToRows: e.target.checked,
                })
              }
            />
          </div>
        </label>

        <div className="pt-1">
          <p className="mb-2 text-[11px] leading-4 text-gray-500">
            既存のカット番号を 1 つ選ぶと、番号設定の「配置する番号」を開始番号にして、その番号以降を振り直します。ページをまたぐ順はページ順、同じページ内は現在の番号順です。
          </p>
          <button
            type="button"
            disabled={!canRenumber}
            onClick={() => {
              if (!selectedCutId) return;
              onRenumberFromSelected(selectedCutId);
            }}
            className={`w-full px-3 py-2 rounded text-xs font-bold transition-colors ${
              canRenumber
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title={
              canRenumber
                ? '選択したカット以降を、番号設定の「配置する番号」を開始番号にして振り直します。ページをまたぐ順はページ順、同じページ内は現在の番号順です'
                : '既存のカット番号を選択してください'
            }
          >
            カット番号を振り直し
          </button>
        </div>
      </div>
    </div>
  );
};
