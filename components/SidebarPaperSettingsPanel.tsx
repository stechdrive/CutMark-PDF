import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  FolderUp,
  Minus,
  Plus,
  Save,
  Trash,
} from 'lucide-react';
import { Template } from '../types';
import {
  downloadSingleTemplateDocument,
  downloadTemplateBundleDocument,
} from '../repositories/templateTransferRepository';

interface SidebarPaperSettingsPanelProps {
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  deleteTemplate: () => void;
  distributeRows: () => void;
  importTemplateDocument: (serialized: string) => { scope: 'single' | 'multiple'; templates: Template[] };
}

export const SidebarPaperSettingsPanel: React.FC<SidebarPaperSettingsPanelProps> = ({
  templates,
  template,
  setTemplate,
  changeTemplate,
  saveTemplateByName,
  deleteTemplate,
  distributeRows,
  importTemplateDocument,
}) => {
  const [localState, setLocalState] = useState(() => ({
    templateId: template.id,
    inputValue: template.name,
    isDropdownOpen: false,
    isTransferMenuOpen: false,
    isDeleting: false,
    showSaveSuccess: false,
    importStatus: '',
  }));

  const dropdownRef = useRef<HTMLDivElement>(null);
  const transferMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isSameTemplate = localState.templateId === template.id;
  const inputValue = isSameTemplate ? localState.inputValue : template.name;
  const isDropdownOpen = isSameTemplate ? localState.isDropdownOpen : false;
  const isTransferMenuOpen = isSameTemplate ? localState.isTransferMenuOpen : false;
  const isDeleting = isSameTemplate ? localState.isDeleting : false;
  const showSaveSuccess = isSameTemplate ? localState.showSaveSuccess : false;
  const importStatus = isSameTemplate ? localState.importStatus : '';

  const updateLocalState = (updates: Partial<typeof localState>) => {
    setLocalState((prev) => ({
      ...prev,
      templateId: template.id,
      ...updates,
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLocalState((prev) => ({ ...prev, isDropdownOpen: false }));
      }
      if (transferMenuRef.current && !transferMenuRef.current.contains(event.target as Node)) {
        setLocalState((prev) => ({ ...prev, isTransferMenuOpen: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    saveTemplateByName(inputValue);
    updateLocalState({ showSaveSuccess: true });
    const savedTemplateId = template.id;
    setTimeout(() => {
      setLocalState((prev) =>
        prev.templateId === savedTemplateId
          ? { ...prev, showSaveSuccess: false }
          : prev
      );
    }, 2000);
  };

  const handleSelect = (id: string) => {
    changeTemplate(id);
    updateLocalState({ isDropdownOpen: false, isDeleting: false });
  };

  const showImportStatus = (message: string, templateId: string, nextInputValue: string) => {
    updateLocalState({
      importStatus: message,
      templateId,
      inputValue: nextInputValue,
      isDropdownOpen: false,
      isTransferMenuOpen: false,
      isDeleting: false,
    });
    window.setTimeout(() => {
      setLocalState((prev) =>
        prev.templateId === templateId
          ? { ...prev, importStatus: '' }
          : prev
      );
    }, 2500);
  };

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const serialized = await file.text();
      const imported = importTemplateDocument(serialized);
      const importedTemplateId = imported.templates[0]?.id ?? template.id;
      const importedTemplateName = imported.templates[0]?.name ?? template.name;
      if (imported.templates.length > 0) {
        setTemplate(imported.templates[0]);
      }
      showImportStatus(
        imported.templates.length === 1
          ? 'テンプレートをインポートしました'
          : `${imported.templates.length}件のテンプレートをインポートしました`,
        importedTemplateId,
        importedTemplateName
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'テンプレート読込中にエラーが発生しました';
      alert(message);
    }
  };

  const handleDeleteClick = () => {
    if (isDeleting) {
      deleteTemplate();
      updateLocalState({ isDeleting: false });
      return;
    }

    updateLocalState({ isDeleting: true });
  };

  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">コンテ用紙設定</h3>
        <p className="mt-1 text-[11px] leading-4 text-gray-500">
          赤線と青線をドラッグして用紙枠を調整します。整えたら必要に応じて保存してください。
        </p>
      </div>

      <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
        <div className="relative" ref={dropdownRef}>
          <div className="flex h-9 rounded-md border border-gray-300 bg-white transition-shadow focus-within:ring-2 focus-within:ring-blue-200">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => updateLocalState({ inputValue: event.target.value })}
              onFocus={() => updateLocalState({ isDropdownOpen: true })}
              disabled={isDeleting}
              placeholder="テンプレート名を入力..."
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => updateLocalState({ isDropdownOpen: !isDropdownOpen })}
              disabled={isDeleting}
              className="border-l border-gray-200 px-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {templates.map((currentTemplate) => (
                <button
                  key={currentTemplate.id}
                  type="button"
                  onClick={() => handleSelect(currentTemplate.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                    currentTemplate.id === template.id
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {currentTemplate.name}
                  {currentTemplate.id === template.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              void handleImportFileChange(event);
            }}
          />
          <button
            type="button"
            onClick={handleImportButtonClick}
            className="inline-flex items-center justify-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-700"
            title="テンプレート JSON をインポートします。単体か複数かは中身を見て自動判定します。"
          >
            <FolderUp size={14} /> インポート
          </button>

          <div className="relative" ref={transferMenuRef}>
            <button
              type="button"
              onClick={() => updateLocalState({ isTransferMenuOpen: !isTransferMenuOpen })}
              className="inline-flex items-center justify-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-700"
              title="現在のテンプレート、または保存済みテンプレート一覧をエクスポートします。"
            >
              <Download size={14} /> エクスポート
            </button>

            {isTransferMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    downloadSingleTemplateDocument(template);
                    updateLocalState({ isTransferMenuOpen: false });
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50"
                >
                  このテンプレートをエクスポート
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadTemplateBundleDocument(templates);
                    updateLocalState({ isTransferMenuOpen: false });
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50"
                >
                  保存済みテンプレートを全部エクスポート
                </button>
              </div>
            )}
          </div>
        </div>

        {importStatus && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] leading-4 text-emerald-700">
            {importStatus}
          </div>
        )}

        <div className="flex gap-2">
          {!isDeleting ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={!inputValue.trim()}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded border py-1.5 text-xs transition-all ${
                  showSaveSuccess
                    ? 'border-green-300 bg-green-100 text-green-700'
                    : 'border-blue-700 bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {showSaveSuccess ? <Check size={14} /> : <Save size={14} />}
                {showSaveSuccess ? '保存しました' : '保存'}
              </button>

              <button
                type="button"
                onClick={() => updateLocalState({ isDeleting: true })}
                disabled={templates.length <= 1}
                className="flex items-center justify-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-red-600 disabled:opacity-50"
                title="削除"
              >
                <Trash size={14} />
              </button>
            </>
          ) : (
            <div className="flex flex-1 gap-2 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex flex-1 items-center justify-center gap-2 rounded border border-red-700 bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                <AlertTriangle size={14} /> 削除する
              </button>
              <button
                type="button"
                onClick={() => updateLocalState({ isDeleting: false })}
                className="rounded border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">行数</span>
            <div className="flex items-center rounded border bg-white">
              <button
                type="button"
                onClick={() => {
                  const newCount = Math.max(1, template.rowCount - 1);
                  setTemplate((currentTemplate) => ({
                    ...currentTemplate,
                    rowCount: newCount,
                    rowPositions: currentTemplate.rowPositions.slice(0, newCount),
                  }));
                }}
                className="px-2 py-1 text-gray-600 hover:bg-gray-100"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 px-2 text-center text-sm font-medium">{template.rowCount}</span>
              <button
                type="button"
                onClick={() => {
                  if (template.rowCount >= 9) return;
                  const newCount = template.rowCount + 1;
                  const lastY = template.rowPositions[template.rowPositions.length - 1] || 0;
                  setTemplate((currentTemplate) => ({
                    ...currentTemplate,
                    rowCount: newCount,
                    rowPositions: [
                      ...currentTemplate.rowPositions,
                      Math.min(0.95, lastY + 0.15),
                    ],
                  }));
                }}
                disabled={template.rowCount >= 9}
                className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={distributeRows}
            disabled={template.rowCount <= 2}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="1行目と最終行を基準に、中間のカット番号を配置する基準線を均等に並べ直します。"
          >
            <ArrowUpDown size={14} /> 行ガイドを均等配置
          </button>
        </div>
      </div>
    </div>
  );
};
