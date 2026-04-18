import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useWorkspacePresentation } from '../../hooks/useWorkspacePresentation';
import { createAppSettings, createTemplate } from '../../test/factories';

describe('useWorkspacePresentation', () => {
  it('routes loaded project updates to the project draft API', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const loadedProject = createProjectDocument({
      settings: createAppSettings({ nextNumber: 20, fontSize: 36 }),
      template: createTemplate({ xPosition: 0.3 }),
    });

    const templateApi = {
      templates: [template],
      template,
      setTemplate: vi.fn(),
      changeTemplate: vi.fn(),
      saveTemplateByName: vi.fn(),
      saveTemplateDraftByName: vi.fn(() => createTemplate({ id: 'saved' })),
      deleteTemplate: vi.fn(),
      deleteTemplateById: vi.fn(() => createTemplate({ id: 'fallback' })),
      distributeRows: vi.fn(),
    };
    const projectDraftApi = {
      updateSettings: vi.fn(),
      updateTemplate: vi.fn(),
      beginTransaction: vi.fn(),
      commitTransaction: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWorkspacePresentation({
        loadedProject,
        settings,
        setSettings: vi.fn(),
        setCurrentNumberingStateWithHistory: vi.fn(),
        templateApi,
        projectDraftApi,
      })
    );

    expect(result.current.effectiveSettings.nextNumber).toBe(20);
    expect(result.current.effectiveTemplate.xPosition).toBe(0.3);

    act(() => {
      result.current.setEffectiveSettings((current) => ({
        ...current,
        fontSize: 40,
      }));
      result.current.setEffectiveTemplate((current) => ({
        ...current,
        xPosition: 0.5,
      }));
      result.current.setEffectiveNumberingState({ nextNumber: 30, branchChar: 'A' });
      result.current.handleTemplateChange(template.id);
      result.current.handleSaveTemplate('Saved');
      result.current.handleDeleteTemplate();
      result.current.handleProjectDraftInteractionStart();
      result.current.handleProjectDraftInteractionEnd();
    });

    expect(projectDraftApi.updateSettings).toHaveBeenCalled();
    expect(projectDraftApi.updateTemplate).toHaveBeenCalled();
    expect(projectDraftApi.beginTransaction).toHaveBeenCalledTimes(1);
    expect(projectDraftApi.commitTransaction).toHaveBeenCalledTimes(1);
    expect(templateApi.changeTemplate).not.toHaveBeenCalled();
  });

  it('routes current document updates to local settings and template APIs', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const setSettings = vi.fn();
    const setCurrentNumberingStateWithHistory = vi.fn();
    const templateApi = {
      templates: [template],
      template,
      setTemplate: vi.fn(),
      changeTemplate: vi.fn(),
      saveTemplateByName: vi.fn(),
      saveTemplateDraftByName: vi.fn(),
      deleteTemplate: vi.fn(),
      deleteTemplateById: vi.fn(),
      distributeRows: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWorkspacePresentation({
        loadedProject: null,
        settings,
        setSettings,
        setCurrentNumberingStateWithHistory,
        templateApi,
        projectDraftApi: {
          updateSettings: vi.fn(),
          updateTemplate: vi.fn(),
          beginTransaction: vi.fn(),
          commitTransaction: vi.fn(),
        },
      })
    );

    act(() => {
      result.current.setEffectiveSettings((current) => ({
        ...current,
        fontSize: 18,
      }));
      result.current.setEffectiveTemplate((current) => ({
        ...current,
        xPosition: 0.2,
      }));
      result.current.setEffectiveNumberingState({ nextNumber: 8, branchChar: null });
      result.current.handleTemplateChange(template.id);
      result.current.handleSaveTemplate('Local');
      result.current.handleDeleteTemplate();
      result.current.handleDistributeRows();
    });

    expect(setSettings).toHaveBeenCalledTimes(1);
    expect(templateApi.setTemplate).toHaveBeenCalledTimes(1);
    expect(setCurrentNumberingStateWithHistory).toHaveBeenCalledWith({
      nextNumber: 8,
      branchChar: null,
    });
    expect(templateApi.changeTemplate).toHaveBeenCalledWith(template.id);
    expect(templateApi.saveTemplateByName).toHaveBeenCalledWith('Local');
    expect(templateApi.deleteTemplate).toHaveBeenCalledTimes(1);
    expect(templateApi.distributeRows).toHaveBeenCalledTimes(1);
  });
});
