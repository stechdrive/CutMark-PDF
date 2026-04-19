import { describe, expect, it } from 'vitest';
import {
  parseTemplateImportDocument,
  sanitizeTemplateStorageValue,
} from '../../repositories/templateTransferRepository';

describe('repositories/templateTransferRepository', () => {
  it('parses a single template document and sanitizes its values', () => {
    const parsed = parseTemplateImportDocument(
      JSON.stringify({
        kind: 'cutmark-template',
        version: 1,
        template: {
          name: '  読込テンプレート  ',
          rowCount: 3,
          xPosition: 1.4,
          rowPositions: [0.8, 0.2, 0.5],
        },
      })
    );

    expect(parsed.scope).toBe('single');
    expect(parsed.templates).toEqual([
      {
        name: '読込テンプレート',
        rowCount: 3,
        xPosition: 1,
        rowPositions: [0.2, 0.5, 0.8],
      },
    ]);
  });

  it('parses bundled templates from a templates array payload', () => {
    const parsed = parseTemplateImportDocument(
      JSON.stringify({
        templates: [
          {
            name: '3行',
            rowCount: 3,
            xPosition: 0.12,
            rowPositions: [0.1, 0.5, 0.9],
          },
          {
            name: '',
            rowCount: 0,
            xPosition: -0.5,
            rowPositions: [],
          },
        ],
      })
    );

    expect(parsed.scope).toBe('multiple');
    expect(parsed.templates[0]).toMatchObject({
      name: '3行',
      rowCount: 3,
      xPosition: 0.12,
      rowPositions: [0.1, 0.5, 0.9],
    });
    expect(parsed.templates[1]).toMatchObject({
      name: '読込テンプレート',
      rowCount: 5,
      xPosition: 0,
    });
    expect(parsed.templates[1].rowPositions).toHaveLength(5);
  });

  it('sanitizes stored templates and falls back to one default template when invalid', () => {
    expect(
      sanitizeTemplateStorageValue([
        {
          name: '保存済み',
          rowCount: 4,
          xPosition: 0.2,
          rowPositions: [0.1, 0.3, 0.5, 0.7],
        },
      ])
    ).toEqual([
      {
        name: '保存済み',
        rowCount: 4,
        xPosition: 0.2,
        rowPositions: [0.1, 0.3, 0.5, 0.7],
      },
    ]);

    const fallback = sanitizeTemplateStorageValue({ invalid: true });
    expect(fallback).toHaveLength(1);
    expect(fallback[0]).toMatchObject({
      name: '標準5行',
      rowCount: 5,
      xPosition: 0.07,
    });
  });
});
