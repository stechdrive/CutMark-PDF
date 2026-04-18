import { describe, expect, it } from 'vitest';
import { createAppSettings, createCut, createTemplate } from '../../test/factories';
import {
  createAppSettingsFromProjectDocument,
  createTemplateFromProjectDocument,
} from '../../application/projectPresentation';
import { createProjectDocumentFromLegacySnapshot } from '../../adapters/legacyProjectAdapter';

describe('application/projectPresentation', () => {
  it('projects app settings and template from a project document', () => {
    const project = createProjectDocumentFromLegacySnapshot({
      cuts: [
        createCut({ id: 'cut-1', pageIndex: 0, label: '010', y: 0.2 }),
        createCut({ id: 'cut-2', pageIndex: 1, label: '011', y: 0.1 }),
      ],
      settings: createAppSettings({
        nextNumber: 12,
        minDigits: 4,
        fontSize: 32,
        useWhiteBackground: true,
      }),
      template: createTemplate({ id: 'custom', name: 'Custom', rowCount: 3 }),
      pageCount: 2,
      projectName: 'Episode 04',
    });

    const projectedSettings = createAppSettingsFromProjectDocument(project);
    const projectedTemplate = createTemplateFromProjectDocument(project);

    expect(projectedSettings).toMatchObject({
      nextNumber: 12,
      minDigits: 4,
      fontSize: 32,
      useWhiteBackground: true,
    });
    expect(projectedTemplate).toMatchObject({
      id: 'custom',
      name: 'Custom',
      rowCount: 3,
    });
  });
});
