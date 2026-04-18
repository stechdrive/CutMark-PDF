import { describe, expect, it, vi } from 'vitest';
import {
  createProjectDownloadFileName,
  downloadProjectDocument,
  loadProjectDocumentFromFile,
  parseProjectDocument,
  PROJECT_FILE_EXTENSION,
  serializeProjectDocument,
} from '../../repositories/projectRepository';
import {
  createLogicalPage,
  createProjectDocument,
} from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const project = createProjectDocument({
  settings: createAppSettings(),
  template: createTemplate(),
  name: 'Episode / 01',
  savedAt: '2026-04-18T00:00:00.000Z',
  logicalPages: [
    createLogicalPage({
      id: 'page-1',
      cuts: [{ id: 'cut-1', x: 0.1, y: 0.2, label: '001', isBranch: false }],
    }),
  ],
});

describe('repositories/projectRepository', () => {
  it('serializes and parses a valid project document', () => {
    const serialized = serializeProjectDocument(project);
    const parsed = parseProjectDocument(serialized);

    expect(parsed).toEqual(project);
    expect(parsed).not.toBe(project);
  });

  it('rejects an unsupported project version', () => {
    expect(() =>
      parseProjectDocument(JSON.stringify({ ...project, version: 999 }))
    ).toThrow('Unsupported project version');
  });

  it('creates a safe project filename', () => {
    expect(createProjectDownloadFileName('Episode / 01')).toBe(
      `Episode - 01${PROJECT_FILE_EXTENSION}`
    );
    expect(createProjectDownloadFileName(`sample${PROJECT_FILE_EXTENSION}`)).toBe(
      `sample${PROJECT_FILE_EXTENSION}`
    );
  });

  it('loads a project document from a file object', async () => {
    const file = new File([serializeProjectDocument(project)], 'episode.cutmark', {
      type: 'application/json',
    });

    await expect(loadProjectDocumentFromFile(file)).resolves.toEqual(project);
  });

  it('downloads a serialized project document', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    downloadProjectDocument(project);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
  });
});
