
import React from 'react';
import { AppSettings, NumberingState, Template } from '../types';
import { SidebarNumberingSettings } from './SidebarNumberingSettings';
import { SidebarStyleSettings } from './SidebarStyleSettings';
import { SidebarPaperSettingsPanel } from './SidebarPaperSettingsPanel';
import { SidebarTemplateSelector } from './SidebarTemplateSelector';
import { MobileUiScaleSettings } from './MobileUiScaleSettings';

interface SidebarProps {
  layout?: 'desktop' | 'mobile';
  mode: 'edit' | 'template';
  pdfFile: File | null;
  selectedCutId: string | null;
  // Template Props
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  deleteTemplate: () => void;
  distributeRows: () => void;
  importTemplateDocument: (serialized: string) => { scope: 'single' | 'multiple'; templates: Template[] };
  onRowSnap: (index: number) => void;
  // Settings Props
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setLiveSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLiveSettingsStart?: () => void;
  onLiveSettingsEnd?: () => void;
  setNumberingState: (next: NumberingState) => void;
  onRenumberFromSelected: (cutId: string) => void;
  mobileAutoUiScale?: number;
  mobileUserUiScale?: number;
  mobileEffectiveUiScale?: number;
  onMobileUiScaleChange?: (next: number) => void;
  onResetMobileUiScale?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  layout = 'desktop',
  mode,
  selectedCutId,
  templates,
  template,
  setTemplate,
  changeTemplate,
  saveTemplateByName,
  deleteTemplate,
  distributeRows,
  importTemplateDocument,
  settings,
  setSettings,
  setLiveSettings,
  onLiveSettingsStart,
  onLiveSettingsEnd,
  setNumberingState,
  onRenumberFromSelected,
  mobileAutoUiScale,
  mobileUserUiScale,
  mobileEffectiveUiScale,
  onMobileUiScaleChange,
  onResetMobileUiScale,
}) => {
  const isMobileLayout = layout === 'mobile';
  const showMobileUiScaleSettings =
    isMobileLayout &&
    typeof mobileAutoUiScale === 'number' &&
    typeof mobileUserUiScale === 'number' &&
    typeof mobileEffectiveUiScale === 'number' &&
    typeof onMobileUiScaleChange === 'function' &&
    typeof onResetMobileUiScale === 'function';

  return (
    <div
      className={`flex min-h-0 flex-col bg-white ${
        isMobileLayout ? 'h-full' : 'z-20 w-80 border-l border-gray-200 shadow-xl'
      }`}
    >
      <div className={`flex-1 overflow-y-auto ${isMobileLayout ? 'p-3' : 'p-3'}`}>
        {mode === 'template' ? (
          <div className="space-y-4">
            <SidebarPaperSettingsPanel
              templates={templates}
              template={template}
              setTemplate={setTemplate}
              changeTemplate={changeTemplate}
              saveTemplateByName={saveTemplateByName}
              deleteTemplate={deleteTemplate}
              distributeRows={distributeRows}
              importTemplateDocument={importTemplateDocument}
            />
            {showMobileUiScaleSettings && (
              <MobileUiScaleSettings
                autoUiScale={mobileAutoUiScale}
                userUiScale={mobileUserUiScale}
                effectiveUiScale={mobileEffectiveUiScale}
                onChange={onMobileUiScaleChange}
                onReset={onResetMobileUiScale}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <SidebarTemplateSelector
              templates={templates}
              template={template}
              changeTemplate={changeTemplate}
            />

            <p
              className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] leading-4 text-sky-800"
              title="画面をクリックしてカット番号を配置します。用紙設定で指定したカット番号列の近くなら自動スナップし、必要なら 1〜9 キーでも入力できます。"
            >
              画面クリックで配置。カット番号列付近なら自動スナップ。
            </p>

            <SidebarNumberingSettings
              settings={settings}
              setSettings={setSettings}
              setNumberingState={setNumberingState}
              selectedCutId={selectedCutId}
              onRenumberFromSelected={onRenumberFromSelected}
            />

            <SidebarStyleSettings
              settings={settings}
              setSettings={setSettings}
              setLiveSettings={setLiveSettings}
              onLiveChangeStart={onLiveSettingsStart}
              onLiveChangeEnd={onLiveSettingsEnd}
            />

            {showMobileUiScaleSettings && (
              <MobileUiScaleSettings
                autoUiScale={mobileAutoUiScale}
                userUiScale={mobileUserUiScale}
                effectiveUiScale={mobileEffectiveUiScale}
                onChange={onMobileUiScaleChange}
                onReset={onResetMobileUiScale}
              />
            )}
          </div>
        )}
      </div>

      {!isMobileLayout && (
        <div className="border-t border-gray-200 bg-white px-3 py-2 text-center text-[10px] leading-4 text-gray-400">
          CutMark PDF v{__APP_VERSION__}<br />Copyright (c) 2025 stechdrive<br />
          ブラウザ内でのみ処理を行います<br />
          読み込みんだデータや保存したテンプレートが<br />
          サーバーに送信されることはありません
        </div>
      )}
    </div>
  );
};
