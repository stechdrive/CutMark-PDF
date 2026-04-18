
import React from 'react';
import { AppSettings, NumberingState, Template } from '../types';
import { SidebarNumberingSettings } from './SidebarNumberingSettings';
import { SidebarStyleSettings } from './SidebarStyleSettings';
import { SidebarPaperSettingsPanel } from './SidebarPaperSettingsPanel';
import { SidebarTemplateSelector } from './SidebarTemplateSelector';

interface SidebarProps {
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
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
  onRowSnap: (index: number) => void;
  // Settings Props
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setLiveSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLiveSettingsStart?: () => void;
  onLiveSettingsEnd?: () => void;
  setNumberingState: (next: NumberingState) => void;
  onRenumberFromSelected: (cutId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  setMode,
  selectedCutId,
  templates,
  template,
  setTemplate,
  changeTemplate,
  saveTemplateByName,
  deleteTemplate,
  distributeRows,
  settings,
  setSettings,
  setLiveSettings,
  onLiveSettingsStart,
  onLiveSettingsEnd,
  setNumberingState,
  onRenumberFromSelected,
}) => {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'template' ? (
          <SidebarPaperSettingsPanel
            templates={templates}
            template={template}
            setTemplate={setTemplate}
            changeTemplate={changeTemplate}
            saveTemplateByName={saveTemplateByName}
            deleteTemplate={deleteTemplate}
            distributeRows={distributeRows}
            setMode={setMode}
          />
        ) : (
          <div className="space-y-6">
            <SidebarTemplateSelector
              templates={templates}
              template={template}
              changeTemplate={changeTemplate}
            />

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
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-400 bg-white">
        CutMark PDF v{__APP_VERSION__}<br />Copyright (c) 2025 stechdrive<br />
        ブラウザ内でのみ処理を行います<br />
        読み込みんだデータや保存したテンプレートが<br />
        サーバーに送信されることはありません
      </div>
    </div>
  );
};
