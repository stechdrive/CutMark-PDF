import { describe, expect, it } from 'vitest';
import { createProjectImportContextFromPlan } from '../../application/workspaceImport';

describe('createProjectImportContextFromPlan', () => {
  it('creates a deferred PDF import context without pre-parsing the document', async () => {
    const pdfFile = new File(['pdf'], 'storyboard.pdf', { type: 'application/pdf' });

    await expect(createProjectImportContextFromPlan({
      projectFile: new File(['{}'], 'storyboard.cutmark', { type: 'application/json' }),
      assetType: 'pdf',
      pdfFile,
      imageFiles: [],
      unsupportedFiles: [],
    })).resolves.toEqual({
      docType: 'pdf',
      numPages: 0,
      currentAssetHints: [],
      autoApplyWhenReady: true,
    });
  });
});
