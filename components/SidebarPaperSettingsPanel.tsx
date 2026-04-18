import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Save,
  Trash,
} from 'lucide-react';
import { Template } from '../types';

interface SidebarPaperSettingsPanelProps {
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  deleteTemplate: () => void;
  distributeRows: () => void;
}

export const SidebarPaperSettingsPanel: React.FC<SidebarPaperSettingsPanelProps> = ({
  templates,
  template,
  setTemplate,
  changeTemplate,
  saveTemplateByName,
  deleteTemplate,
  distributeRows,
}) => {
  const [localState, setLocalState] = useState(() => ({
    templateId: template.id,
    inputValue: template.name,
    isDropdownOpen: false,
    isDeleting: false,
    showSaveSuccess: false,
  }));

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSameTemplate = localState.templateId === template.id;
  const inputValue = isSameTemplate ? localState.inputValue : template.name;
  const isDropdownOpen = isSameTemplate ? localState.isDropdownOpen : false;
  const isDeleting = isSameTemplate ? localState.isDeleting : false;
  const showSaveSuccess = isSameTemplate ? localState.showSaveSuccess : false;

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
            title="1行目と最終行を基準に、間の行を等間隔に並べ直します。"
          >
            <ArrowUpDown size={14} /> 縦位置を均等配置
          </button>
        </div>
      </div>
    </div>
  );
};
