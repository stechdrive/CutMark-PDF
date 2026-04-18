import { SetStateAction, useCallback, useMemo } from 'react';
import {
  createAppSettingsFromProjectDocument,
  createTemplateFromProjectDocument,
} from '../application/projectPresentation';
import { ProjectDocument } from '../domain/project';
import { AppSettings, NumberingState, Template } from '../types';

interface WorkspaceTemplateApi {
  templates: Template[];
  template: Template;
  setTemplate: (next: SetStateAction<Template>) => void;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  saveTemplateDraftByName: (template: Template, name: string) => Template | null;
  deleteTemplate: () => void;
  deleteTemplateById: (id: string) => Template | null;
  distributeRows: () => void;
}

interface WorkspaceProjectDraftApi {
  updateSettings: (
    next: SetStateAction<AppSettings>,
    options?: { pushHistory?: boolean }
  ) => void;
  updateTemplate: (
    next: SetStateAction<Template>,
    options?: { pushHistory?: boolean }
  ) => void;
  beginTransaction: () => void;
  commitTransaction: () => void;
}

interface UseWorkspacePresentationOptions {
  loadedProject: ProjectDocument | null;
  settings: AppSettings;
  setSettings: (next: SetStateAction<AppSettings>) => void;
  setCurrentNumberingStateWithHistory: (next: NumberingState) => void;
  templateApi: WorkspaceTemplateApi;
  projectDraftApi: WorkspaceProjectDraftApi;
}

export const useWorkspacePresentation = ({
  loadedProject,
  settings,
  setSettings,
  setCurrentNumberingStateWithHistory,
  templateApi,
  projectDraftApi,
}: UseWorkspacePresentationOptions) => {
  const effectiveSettings = useMemo(
    () =>
      loadedProject
        ? createAppSettingsFromProjectDocument(loadedProject)
        : settings,
    [loadedProject, settings]
  );

  const effectiveTemplate = useMemo(
    () =>
      loadedProject
        ? createTemplateFromProjectDocument(loadedProject)
        : templateApi.template,
    [loadedProject, templateApi.template]
  );

  const setEffectiveSettings = useCallback((next: SetStateAction<AppSettings>) => {
    if (loadedProject) {
      projectDraftApi.updateSettings(next, { pushHistory: true });
      return;
    }
    setSettings(next);
  }, [loadedProject, projectDraftApi, setSettings]);

  const setEffectiveSettingsLive = useCallback((next: SetStateAction<AppSettings>) => {
    if (loadedProject) {
      projectDraftApi.updateSettings(next, { pushHistory: false });
      return;
    }
    setSettings(next);
  }, [loadedProject, projectDraftApi, setSettings]);

  const setEffectiveTemplate = useCallback((next: SetStateAction<Template>) => {
    if (loadedProject) {
      projectDraftApi.updateTemplate(next, { pushHistory: true });
      return;
    }
    templateApi.setTemplate(next);
  }, [loadedProject, projectDraftApi, templateApi]);

  const setEffectiveTemplateLive = useCallback((next: SetStateAction<Template>) => {
    if (loadedProject) {
      projectDraftApi.updateTemplate(next, { pushHistory: false });
      return;
    }
    templateApi.setTemplate(next);
  }, [loadedProject, projectDraftApi, templateApi]);

  const setEffectiveNumberingState = useCallback((next: NumberingState) => {
    if (loadedProject) {
      projectDraftApi.updateSettings((current) => ({
        ...current,
        nextNumber: next.nextNumber,
        branchChar: next.branchChar,
      }), { pushHistory: true });
      return;
    }
    setCurrentNumberingStateWithHistory(next);
  }, [loadedProject, projectDraftApi, setCurrentNumberingStateWithHistory]);

  const handleTemplateChange = useCallback((id: string) => {
    if (!loadedProject) {
      templateApi.changeTemplate(id);
      return;
    }

    const nextTemplate = templateApi.templates.find((item) => item.id === id);
    if (!nextTemplate) return;
    projectDraftApi.updateTemplate(nextTemplate, { pushHistory: true });
  }, [loadedProject, projectDraftApi, templateApi]);

  const handleSaveTemplate = useCallback((name: string) => {
    if (!loadedProject) {
      templateApi.saveTemplateByName(name);
      return;
    }

    const savedTemplate = templateApi.saveTemplateDraftByName(effectiveTemplate, name);
    if (savedTemplate) {
      projectDraftApi.updateTemplate(savedTemplate, { pushHistory: true });
    }
  }, [effectiveTemplate, loadedProject, projectDraftApi, templateApi]);

  const handleDeleteTemplate = useCallback(() => {
    if (!loadedProject) {
      templateApi.deleteTemplate();
      return;
    }

    const nextTemplate = templateApi.deleteTemplateById(effectiveTemplate.id);
    if (nextTemplate) {
      projectDraftApi.updateTemplate(nextTemplate, { pushHistory: true });
    }
  }, [effectiveTemplate.id, loadedProject, projectDraftApi, templateApi]);

  const handleDistributeRows = useCallback(() => {
    if (!loadedProject) {
      templateApi.distributeRows();
      return;
    }

    setEffectiveTemplate((current) => {
      if (current.rowCount <= 2) return current;

      const newPositions = [...current.rowPositions];
      const first = newPositions[0];
      const last = newPositions[current.rowCount - 1];
      if (typeof first !== 'number' || typeof last !== 'number') {
        return current;
      }

      const step = (last - first) / (current.rowCount - 1);
      for (let i = 1; i < current.rowCount - 1; i++) {
        newPositions[i] = first + (step * i);
      }

      return {
        ...current,
        rowPositions: newPositions,
      };
    });
  }, [loadedProject, setEffectiveTemplate, templateApi]);

  const handleProjectDraftInteractionStart = useCallback(() => {
    if (!loadedProject) return;
    projectDraftApi.beginTransaction();
  }, [loadedProject, projectDraftApi]);

  const handleProjectDraftInteractionEnd = useCallback(() => {
    if (!loadedProject) return;
    projectDraftApi.commitTransaction();
  }, [loadedProject, projectDraftApi]);

  return {
    effectiveSettings,
    effectiveTemplate,
    setEffectiveSettings,
    setEffectiveSettingsLive,
    setEffectiveTemplate,
    setEffectiveTemplateLive,
    setEffectiveNumberingState,
    handleTemplateChange,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleDistributeRows,
    handleProjectDraftInteractionStart,
    handleProjectDraftInteractionEnd,
  };
};
