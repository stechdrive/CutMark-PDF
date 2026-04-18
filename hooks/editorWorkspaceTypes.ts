import { Dispatch, SetStateAction } from 'react';
import { AssetHint, TemplateSnapshot } from '../domain/project';
import { AppSettings, DocType, NumberingState, Template } from '../types';

export type DebugLogData = unknown | (() => unknown);

export interface EditorWorkspaceTemplateApi {
  templates: Template[];
  template: Template;
  setTemplate: (next: SetStateAction<Template>) => void;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  saveTemplateDraftByName: (template: Template, name: string) => Template | null;
  deleteTemplate: () => void;
  deleteTemplateById: (id: string) => Template | null;
  distributeRows: () => void;
  upsertTemplate: (template: TemplateSnapshot) => void;
}

export interface UseEditorWorkspaceOptions {
  docType: DocType | null;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  setSettings: (next: SetStateAction<AppSettings>) => void;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  templateApi: EditorWorkspaceTemplateApi;
  setMode: (mode: 'edit' | 'template') => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}
