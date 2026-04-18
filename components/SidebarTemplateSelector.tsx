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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900">用紙テンプレート</h3>

      <label className="block">
        <select
          value={template.id}
          onChange={(event) => changeTemplate(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          title="使用するコンテ用紙テンプレートを選びます。行数や保存は「コンテ用紙設定」で行います。"
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
