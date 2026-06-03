import { describe, expect, it } from 'vitest';
import {
  normalizeError,
  redactFileName,
  redactSensitiveText,
  safeJsonStringify,
  toFileInfo,
} from '../../utils/debugData';

describe('debugData privacy helpers', () => {
  it('redacts local filesystem paths from text and errors', () => {
    const text = redactSensitiveText('failed at C:\\Users\\alice\\Documents\\work.pdf');
    expect(text).toBe('failed at [redacted]');

    const error = new Error('open C:\\Users\\alice\\Documents\\work.pdf');
    error.stack = 'Error: open\n    at C:\\Users\\alice\\project\\src.ts:1:1';

    expect(normalizeError(error)).toMatchObject({
      message: 'open [redacted]',
      stack: 'Error: open\n    at [redacted]',
    });
  });

  it('keeps file metadata useful without exposing original names', () => {
    const file = new File(['body'], 'customer-contract.final.pdf', {
      type: 'application/pdf',
      lastModified: Date.UTC(2026, 0, 1),
    });

    expect(redactFileName(file.name)).toBe('[redacted].pdf');
    expect(toFileInfo(file)).toMatchObject({
      name: '[redacted].pdf',
      extension: '.pdf',
      size: 4,
      type: 'application/pdf',
    });
  });

  it('redacts paths while stringifying debug payloads', () => {
    const json = safeJsonStringify({
      file: new File(['img'], 'private-name.png', { type: 'image/png' }),
      stack: 'C:\\Users\\alice\\project\\App.tsx',
    });

    expect(json).toContain('[redacted].png');
    expect(json).toContain('[redacted]');
    expect(json).not.toContain('private-name');
    expect(json).not.toContain('C:\\Users\\alice');
  });
});
