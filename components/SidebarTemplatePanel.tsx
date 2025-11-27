import React, { useState, useEffect } from 'react';
import { Save, FilePlus, Trash, Plus, Minus, ArrowUpDown, Pencil, Check, X, Settings, AlertTriangle } from 'lucide-react';
import { Template } from '../types';

interface SidebarTemplatePanelProps {
  mode: 'edit' | 'template';
  setMode: (mode: 'edit' | 'template') => void;
  templates: Template[];
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  changeTemplate: (id: string) => void;
  saveCurrentTemplate: () => void;
  saveAsNewTemplate: () => void;
  updateTemplateName: (name: string) => void;
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
  saveCurrentTemplate,
  saveAsNewTemplate,
  updateTemplateName,
  deleteTemplate,
  distributeRows,
}) => {
  // Local state for renaming UI
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Local state for deleting UI
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset UI states when template changes
  useEffect(() => {
    setIsRenaming(false);
    setTempName('');
    setIsDeleting(false);
  }, [template.id]);

  const startRenaming = () => {
    setTempName(template.name);
    setIsRenaming(true);
    setIsDeleting(false);
  };

  const cancelRenaming = () => {
    setIsRenaming(false);
    setTempName('');
  };

  const confirmRenaming = () => {
    updateTemplateName(tempName);
    setIsRenaming(false);
  };
  
  const handleDeleteClick = () => {
    if (isDeleting) {
      deleteTemplate();
      setIsDeleting(false);
    } else {
      setIsDeleting(true);
      setIsRenaming(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
        <span>テンプレート設定</span>
        <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
          {mode === 'template' ? '編集中' : '読取のみ'}
        </span>
      </h3>

      <div className="space-y-3">
        {/* Template Selector / Renamer */}
        <div className="flex gap-2 items-center h-10">
          {isRenaming ? (
            <>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1 p-2 border border-blue-500 rounded text-sm outline-none"
                autoFocus
                placeholder="テンプレート名"
              />
              <button
                onClick={confirmRenaming}
                className="p-2 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100"
                title="確定"
              >
                <Check size={16} />
              </button>
              <button
                onClick={cancelRenaming}
                className="p-2 bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100"
                title="キャンセル"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <select
                value={template.id}
                onChange={(e) => changeTemplate(e.target.value)}
                disabled={isDeleting}
                className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white h-full disabled:bg-gray-100 disabled:text-gray-400"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={startRenaming}
                disabled={isDeleting}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 h-full disabled:bg-gray-100 disabled:text-gray-300"
                title="名前を変更"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {!isDeleting ? (
            <>
              <button
                onClick={saveCurrentTemplate}
                className="col-span-1 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded text-xs flex flex-col items-center justify-center gap-1"
                title="現在選択中のテンプレートを上書き保存"
              >
                <Save size={14} /> 保存
              </button>
              <button
                onClick={saveAsNewTemplate}
                className="col-span-1 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 rounded text-xs flex flex-col items-center justify-center gap-1"
                title="コピーを作成して保存"
              >
                <FilePlus size={14} /> 別名保存
              </button>
              <button
                onClick={() => setIsDeleting(true)}
                disabled={templates.length <= 1}
                className="col-span-1 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded text-xs flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                title="現在のテンプレートを削除"
              >
                <Trash size={14} /> 削除
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsDeleting(false)}
                className="col-span-1 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 rounded text-xs flex flex-col items-center justify-center"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteClick}
                className="col-span-2 py-1.5 bg-red-600 text-white border border-red-700 hover:bg-red-700 rounded text-xs flex items-center justify-center gap-2 font-bold animate-in fade-in duration-200"
              >
                <AlertTriangle size={14} /> 本当に削除する
              </button>
            </>
          )}
        </div>

        <hr className="border-gray-100 my-2" />

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
          title="1行目と最終行の間を等間隔に配置します"
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
            画面上の赤線（横位置）と青線（各行の縦位置）をドラッグして、用紙の枠に合わせてください。変更内容は「保存」ボタンで記録されます。
          </p>
        )}
      </div>
    </div>
  );
};