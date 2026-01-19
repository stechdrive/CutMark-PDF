
import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash, Plus, Minus, ArrowUpDown, Settings, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { Template } from '../types';

interface SidebarTemplatePanelProps {
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  deleteTemplate: () => void;
  distributeRows: () => void;
}

export const SidebarTemplatePanel: React.FC<SidebarTemplatePanelProps> = ({
  mode,
  setMode,
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

  // Close dropdown when clicking outside
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
    } else {
      updateLocalState({ isDeleting: true });
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
        <span>テンプレート設定</span>
        <span className={`text-xs font-normal px-2 py-0.5 rounded ${
            mode === 'template' ? 'text-orange-600 bg-orange-100' : 'text-gray-500 bg-gray-100'
        }`}>
          {mode === 'template' ? '編集中' : '読取のみ'}
        </span>
      </h3>

      <div className="space-y-3">
        {/* Combo Box for Template Selection/Entry */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex h-10 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => updateLocalState({ inputValue: e.target.value })}
              onFocus={() => updateLocalState({ isDropdownOpen: true })}
              disabled={isDeleting}
              placeholder="テンプレート名を入力..."
              className="flex-1 px-3 text-sm outline-none bg-transparent min-w-0"
            />
            <button
              onClick={() => updateLocalState({ isDropdownOpen: !isDropdownOpen })}
              disabled={isDeleting}
              className="px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-l border-gray-200"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Dropdown List */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    t.id === template.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {t.name}
                  {t.id === template.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isDeleting ? (
            <>
              <button
                onClick={handleSave}
                disabled={!inputValue.trim()}
                className={`flex-1 py-1.5 border rounded text-xs flex items-center justify-center gap-1.5 transition-all ${
                  showSaveSuccess 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-sm'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {showSaveSuccess ? <Check size={14} /> : <Save size={14} />}
                {showSaveSuccess ? '保存しました' : '保存'}
              </button>
              
              <button
                onClick={() => updateLocalState({ isDeleting: true })}
                disabled={templates.length <= 1}
                className="px-3 py-1.5 bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:text-red-600 rounded text-xs flex items-center justify-center disabled:opacity-50"
                title="削除"
              >
                <Trash size={14} />
              </button>
            </>
          ) : (
            <div className="flex-1 flex gap-2 animate-in fade-in duration-200">
                <button
                    onClick={handleDeleteClick}
                    className="flex-1 py-1.5 bg-red-600 text-white border border-red-700 hover:bg-red-700 rounded text-xs flex items-center justify-center gap-2 font-bold"
                >
                    <AlertTriangle size={14} /> 削除する
                </button>
                <button
                    onClick={() => updateLocalState({ isDeleting: false })}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 rounded text-xs"
                >
                    キャンセル
                </button>
            </div>
          )}
        </div>

        <hr className="border-gray-100 my-2" />

        {/* Row Settings */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">行数</span>
          <div className="flex items-center border rounded">
            <button
              onClick={() => {
                const newCount = Math.max(1, template.rowCount - 1);
                setTemplate((t) => ({
                  ...t,
                  rowCount: newCount,
                  rowPositions: t.rowPositions.slice(0, newCount),
                }));
              }}
              className="px-2 py-1 hover:bg-gray-100 text-gray-600"
            >
              <Minus size={14} />
            </button>
            <span className="px-2 w-8 text-center text-sm font-medium">
              {template.rowCount}
            </span>
            <button
              onClick={() => {
                if (template.rowCount >= 9) return;
                const newCount = template.rowCount + 1;
                const lastY =
                  template.rowPositions[template.rowPositions.length - 1] || 0;
                setTemplate((t) => ({
                  ...t,
                  rowCount: newCount,
                  rowPositions: [
                    ...t.rowPositions,
                    Math.min(0.95, lastY + 0.15),
                  ],
                }));
              }}
              disabled={template.rowCount >= 9}
              className="px-2 py-1 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={distributeRows}
          disabled={template.rowCount <= 2}
          className="w-full py-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUpDown size={14} /> 縦位置を均等配置
        </button>

        {mode !== 'template' && (
          <button
            onClick={() => setMode('template')}
            className="w-full py-2 border border-dashed border-orange-300 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 text-sm flex items-center justify-center gap-2"
          >
            <Settings size={14} /> 位置を調整する
          </button>
        )}
        {mode === 'template' && (
          <p className="text-xs text-gray-500 leading-relaxed">
            画面上の赤線（横位置）と青線（各行の縦位置）をドラッグして枠を調整できます。調整後は「保存」してください。
          </p>
        )}
      </div>
    </div>
  );
};
