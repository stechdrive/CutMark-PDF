import React from 'react';
import { Template } from '../types';

interface SidebarTemplateSelectorProps {
  templates: Template[];
  template: Template;
  changeTemplate: (id: string) => void;
}

export const SidebarTemplateSelector: React.FC<SidebarTemplateSelectorProps> = ({
  templates,
  template,
  changeTemplate,
}) => {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">用紙テンプレート</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          使用する用紙枠を選びます。行数や保存は「コンテ用紙設定」で行います。
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-gray-500">選択中のテンプレート</span>
        <select
          value={template.id}
          onChange={(event) => changeTemplate(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {templates.map((currentTemplate) => (
            <option key={currentTemplate.id} value={currentTemplate.id}>
              {currentTemplate.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
