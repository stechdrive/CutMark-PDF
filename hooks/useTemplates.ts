
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

  // Unified save logic
  const saveTemplateByName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check if a template with this name already exists
    const existingTemplate = templates.find(t => t.name === trimmedName);

    if (existingTemplate) {
      // If the name matches the currently selected template ID, or simply matches the current template by name
      if (existingTemplate.id === template.id) {
        // Overwrite current
        const updated = { ...template, name: trimmedName };
        setTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
        setTemplate(updated);
      } else {
        // Name exists but belongs to another ID.
        if (window.confirm(`テンプレート "${trimmedName}" は既に存在します。内容を上書きしますか？`)) {
             // Overwrite the OTHER template with current settings
             const updated = { ...template, id: existingTemplate.id, name: trimmedName };
             setTemplates(prev => prev.map(t => t.id === existingTemplate.id ? updated : t));
             setTemplate(updated);
        }
      }
    } else {
      // New Name -> Create New
      const newTemplate = {
        ...template,
        id: generateId(),
        name: trimmedName,
      };
      setTemplates(prev => [...prev, newTemplate]);
      setTemplate(newTemplate);
    }
  }, [template, templates]);

  const deleteTemplate = useCallback(() => {
    if (templates.length <= 1) {
      return;
    }

    const newTemplates = templates.filter(t => t.id !== template.id);
    setTemplates(newTemplates);
    // Select the first one available
    setTemplate(newTemplates[0]);
  }, [templates, template]);

  const distributeRows = useCallback(() => {
    if (template.rowCount <= 2) return;
    
    const newPositions = [...template.rowPositions];
    const first = newPositions[0];
    const last = newPositions[template.rowCount - 1];
    
    if (typeof first !== 'number' || typeof last !== 'number') return;

    const step = (last - first) / (template.rowCount - 1);

    for (let i = 1; i < template.rowCount - 1; i++) {
      newPositions[i] = first + (step * i);
    }
    
    setTemplate(t => ({ ...t, rowPositions: newPositions }));
  }, [template]);

  return {
    templates,
    template,
    setTemplate,
    changeTemplate,
    saveTemplateByName,
    deleteTemplate,
    distributeRows
  };
};
