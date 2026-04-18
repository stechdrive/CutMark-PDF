
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Template } from '../types';

const STORAGE_KEY_TEMPLATES = 'cutmark_templates';

const DEFAULT_TEMPLATE: Template = {
  id: 'default',
  name: '標準5行',
  rowCount: 5,
  xPosition: 0.07, // 7% from left
  rowPositions: [0.0872, 0.2525, 0.4179, 0.5832, 0.7485],
};

// Simple ID generator for compatibility
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export const distributeTemplateRows = (template: Template): Template => {
  if (template.rowCount <= 2) return template;

  const newPositions = [...template.rowPositions];
  const first = newPositions[0];
  const last = newPositions[template.rowCount - 1];

  if (typeof first !== 'number' || typeof last !== 'number') {
    return template;
  }

  const step = (last - first) / (template.rowCount - 1);

  for (let i = 1; i < template.rowCount - 1; i++) {
    newPositions[i] = first + (step * i);
  }

  return {
    ...template,
    rowPositions: newPositions,
  };
};

const loadTemplatesFromStorage = (): Template[] => {
  if (typeof window === 'undefined') return [DEFAULT_TEMPLATE];
  const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
  if (!saved) return [DEFAULT_TEMPLATE];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('テンプレートの読み込みに失敗しました', e);
  }
  return [DEFAULT_TEMPLATE];
};

export const useTemplates = () => {
  const initialTemplates = useMemo(() => loadTemplatesFromStorage(), []);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [template, setTemplate] = useState<Template>(() => initialTemplates[0]);

  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  const changeTemplate = useCallback((id: string) => {
    const selected = templates.find(t => t.id === id);
    if (selected) {
      setTemplate(selected);
    }
  }, [templates]);

  const saveTemplateDraftByName = useCallback((templateDraft: Template, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const existingTemplate = templates.find(t => t.name === trimmedName);
    let nextTemplate: Template | null = null;
    let nextTemplates = templates;

    if (existingTemplate) {
      if (existingTemplate.id === templateDraft.id) {
        nextTemplate = { ...templateDraft, name: trimmedName };
        nextTemplates = templates.map((item) =>
          item.id === templateDraft.id ? nextTemplate as Template : item
        );
      } else {
        if (window.confirm(`テンプレート "${trimmedName}" は既に存在します。内容を上書きしますか？`)) {
          nextTemplate = {
            ...templateDraft,
            id: existingTemplate.id,
            name: trimmedName,
          };
          nextTemplates = templates.map((item) =>
            item.id === existingTemplate.id ? nextTemplate as Template : item
          );
        } else {
          return null;
        }
      }
    } else {
      nextTemplate = {
        ...templateDraft,
        id: generateId(),
        name: trimmedName,
      };
      nextTemplates = [...templates, nextTemplate];
    }

    if (!nextTemplate) return null;

    setTemplates(nextTemplates);
    setTemplate(nextTemplate);
    return nextTemplate;
  }, [templates]);

  // Unified save logic
  const saveTemplateByName = useCallback((name: string) => {
    saveTemplateDraftByName(template, name);
  }, [saveTemplateDraftByName, template]);

  const deleteTemplateById = useCallback((templateId: string) => {
    if (templates.length <= 1) {
      return templates[0] ?? null;
    }

    const nextTemplates = templates.filter(t => t.id !== templateId);
    if (nextTemplates.length === templates.length) {
      return template;
    }

    const nextTemplate = nextTemplates[0] ?? null;
    setTemplates(nextTemplates);
    if (nextTemplate) {
      setTemplate(nextTemplate);
    }
    return nextTemplate;
  }, [template, templates]);

  const deleteTemplate = useCallback(() => {
    deleteTemplateById(template.id);
  }, [deleteTemplateById, template.id]);

  const distributeRows = useCallback(() => {
    setTemplate((current) => distributeTemplateRows(current));
  }, []);

  const upsertTemplate = useCallback((incomingTemplate: Template) => {
    setTemplates(prev => {
      const existingById = prev.findIndex(t => t.id === incomingTemplate.id);
      if (existingById !== -1) {
        return prev.map((templateItem, index) =>
          index === existingById ? incomingTemplate : templateItem
        );
      }

      return [...prev, incomingTemplate];
    });
    setTemplate(incomingTemplate);
  }, []);

  return {
    templates,
    template,
    setTemplate,
    changeTemplate,
    saveTemplateByName,
    saveTemplateDraftByName,
    deleteTemplate,
    deleteTemplateById,
    distributeRows,
    upsertTemplate
  };
};
