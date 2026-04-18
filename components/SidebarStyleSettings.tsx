import React from 'react';
import { AppSettings } from '../types';

interface SidebarStyleSettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setLiveSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLiveChangeStart?: () => void;
  onLiveChangeEnd?: () => void;
}

export const SidebarStyleSettings: React.FC<SidebarStyleSettingsProps> = ({
  settings,
  setSettings,
  setLiveSettings,
  onLiveChangeStart,
  onLiveChangeEnd,
}) => {
  const applyLiveSettings = setLiveSettings ?? setSettings;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        表示スタイル
      </h3>
      <div className="space-y-3">
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
            onPointerDown={onLiveChangeStart}
            onPointerUp={onLiveChangeEnd}
            onPointerCancel={onLiveChangeEnd}
            onKeyDown={onLiveChangeStart}
            onKeyUp={onLiveChangeEnd}
            onBlur={onLiveChangeEnd}
            onChange={(e) =>
              applyLiveSettings({
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
            <span>白フチ</span>
            <span>{settings.textOutlineWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max={settings.fontSize}
            value={settings.textOutlineWidth}
            onPointerDown={onLiveChangeStart}
            onPointerUp={onLiveChangeEnd}
            onPointerCancel={onLiveChangeEnd}
            onKeyDown={onLiveChangeStart}
            onKeyUp={onLiveChangeEnd}
            onBlur={onLiveChangeEnd}
            onChange={(e) =>
              applyLiveSettings({
                ...settings,
                textOutlineWidth: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">白背景</span>
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
            <div className="animate-in slide-in-from-top-1 fade-in rounded-md border border-gray-100 bg-gray-50 p-2 duration-200">
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>余白サイズ</span>
                <span>{settings.backgroundPadding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.backgroundPadding}
                onPointerDown={onLiveChangeStart}
                onPointerUp={onLiveChangeEnd}
                onPointerCancel={onLiveChangeEnd}
                onKeyDown={onLiveChangeStart}
                onKeyUp={onLiveChangeEnd}
                onBlur={onLiveChangeEnd}
                onChange={(e) =>
                  applyLiveSettings({
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
