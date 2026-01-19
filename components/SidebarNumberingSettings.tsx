import React from 'react';
import { Settings } from 'lucide-react';
import { AppSettings, NumberingState } from '../types';

interface SidebarNumberingSettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setNumberingState: (next: NumberingState) => void;
}

export const SidebarNumberingSettings: React.FC<SidebarNumberingSettingsProps> = ({
  settings,
  setSettings,
  setNumberingState,
}) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Settings size={16} /> 番号設定
      </h3>

      <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-600">次の番号</label>
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
      </div>
    </div>
  );
};
