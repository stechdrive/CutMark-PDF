import { useState, useEffect, useCallback } from 'react';
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

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([DEFAULT_TEMPLATE]);
  const [template, setTemplate] = useState<Template>(DEFAULT_TEMPLATE);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          setTemplate(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    }
  }, []);

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

  const saveCurrentTemplate = useCallback(() => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    // Alert logic removed for better UX, usually implicit save is fine or UI feedback
  }, [template]);

  const saveAsNewTemplate = useCallback(() => {
    // Automatically generate name to avoid window.prompt issues
    const newName = `${template.name} のコピー`;
    const newTemplate: Template = {
      ...template,
      id: generateId(),
      name: newName,
    };

    setTemplates(prev => [...prev, newTemplate]);
    setTemplate(newTemplate);
  }, [template]);

  const updateTemplateName = useCallback((newName: string) => {
    if (!newName || !newName.trim()) return;
    const trimmedName = newName.trim();
    
    // Update local state
    setTemplate(prev => ({ ...prev, name: trimmedName }));
    // Update list
    setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, name: trimmedName } : t));
  }, [template.id]);

  const deleteTemplate = useCallback(() => {
    if (templates.length <= 1) {
      return;
    }
    // Logic moved to UI: Confirm dialog removed from here

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
    saveCurrentTemplate,
    saveAsNewTemplate,
    updateTemplateName,
    deleteTemplate,
    distributeRows
  };
};