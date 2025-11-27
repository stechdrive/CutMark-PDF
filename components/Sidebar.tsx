import React from 'react';
import { AppSettings, Template } from '../types';
import { SidebarRowSnapper } from './SidebarRowSnapper';
import { SidebarNumberingSettings } from './SidebarNumberingSettings';
import { SidebarStyleSettings } from './SidebarStyleSettings';
import { SidebarTemplatePanel } from './SidebarTemplatePanel';

interface SidebarProps {
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  pdfFile: File | null;
  // Template Props
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveCurrentTemplate: () => void;
  saveAsNewTemplate: () => void;
  updateTemplateName: (name: string) => void;
  deleteTemplate: () => void;
  distributeRows: () => void;
  onRowSnap: (index: number) => void;
  // Settings Props
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  setMode,
  pdfFile,
  templates,
  template,
  setTemplate,
  changeTemplate,
  saveCurrentTemplate,
  saveAsNewTemplate,
  updateTemplateName,
  deleteTemplate,
  distributeRows,
  onRowSnap,
  settings,
  setSettings,
}) => {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
      
      {/* Scrollable Settings Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* 1. Template Settings (Top priority) */}
        <SidebarTemplatePanel
          mode={mode}
          setMode={setMode}
          templates={templates}
          template={template}
          setTemplate={setTemplate}
          changeTemplate={changeTemplate}
          saveCurrentTemplate={saveCurrentTemplate}
          saveAsNewTemplate={saveAsNewTemplate}
          updateTemplateName={updateTemplateName}
          deleteTemplate={deleteTemplate}
          distributeRows={distributeRows}
        />

        {/* 2. Numbering Settings */}
        <SidebarNumberingSettings
          settings={settings}
          setSettings={setSettings}
        />

        {/* 3. Style Settings */}
        <SidebarStyleSettings
          settings={settings}
          setSettings={setSettings}
        />
      </div>

      {/* Fixed Bottom Action Area */}
      <SidebarRowSnapper
        template={template}
        pdfFile={pdfFile}
        mode={mode}
        onRowSnap={onRowSnap}
      />

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-400 bg-white">
        CutMark PDF v2.0.0<br />Copyright (c) 2025 stechdrive<br />
        ブラウザ内でのみ処理を行います<br />
        読み込みんだデータや保存したテンプレートが<br />
        サーバーに送信されることはありません
      </div>
    </div>
  );
};