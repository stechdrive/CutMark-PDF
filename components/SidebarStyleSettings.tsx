import React from 'react';
import { AppSettings } from '../types';

interface SidebarStyleSettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const SidebarStyleSettings: React.FC<SidebarStyleSettingsProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        表示スタイル
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1 text-gray-600">
            <span>文字サイズ</span>
            <span>{settings.fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="72"
            value={settings.fontSize}
            onChange={(e) =>
              setSettings({
                ...settings,
                fontSize: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Outline Width Slider */}
        <div>
          <div className="flex justify-between text-sm mb-1 text-gray-600">
            <span>白フチ (縁取り)</span>
            <span>{settings.textOutlineWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max={settings.fontSize}
            value={settings.textOutlineWidth}
            onChange={(e) =>
              setSettings({
                ...settings,
                textOutlineWidth: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">白座布団 (背景)</span>
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                settings.useWhiteBackground
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                  settings.useWhiteBackground
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
              <input
                type="checkbox"
                className="hidden"
                checked={settings.useWhiteBackground}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    useWhiteBackground: e.target.checked,
                  })
                }
              />
            </div>
          </label>

          {settings.useWhiteBackground && (
            <div className="bg-gray-50 rounded-md p-2 border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>余白サイズ</span>
                <span>{settings.backgroundPadding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.backgroundPadding}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    backgroundPadding: parseInt(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
