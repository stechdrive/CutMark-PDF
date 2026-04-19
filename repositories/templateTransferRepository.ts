import { Template } from '../types';

const TEMPLATE_DOCUMENT_VERSION = 1;
const SINGLE_TEMPLATE_KIND = 'cutmark-template';
const TEMPLATE_BUNDLE_KIND = 'cutmark-template-bundle';
const TEMPLATE_NAME_FALLBACK = '読込テンプレート';

interface TemplatePortableSnapshot {
  name: string;
  rowCount: number;
  xPosition: number;
  rowPositions: number[];
}

interface SingleTemplateDocument {
  kind: typeof SINGLE_TEMPLATE_KIND;
  version: typeof TEMPLATE_DOCUMENT_VERSION;
  template: TemplatePortableSnapshot;
}

interface TemplateBundleDocument {
  kind: typeof TEMPLATE_BUNDLE_KIND;
  version: typeof TEMPLATE_DOCUMENT_VERSION;
  templates: TemplatePortableSnapshot[];
}

export interface ParsedTemplateImportDocument {
  scope: 'single' | 'multiple';
  templates: TemplatePortableSnapshot[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const stripControlCharacters = (value: string) =>
  Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return !(codePoint <= 0x1f || codePoint === 0x7f);
    })
    .join('');

const sanitizeTemplateName = (value: unknown) => {
  if (typeof value !== 'string') {
    return TEMPLATE_NAME_FALLBACK;
  }

  const sanitized = stripControlCharacters(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return sanitized || TEMPLATE_NAME_FALLBACK;
};

const createDefaultRowPositions = (rowCount: number, first = 0.1, last = 0.9) => {
  if (rowCount <= 1) {
    return [0.5];
  }

  const start = clamp(first, 0, 1);
  const end = clamp(last, 0, 1);
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const step = (max - min) / (rowCount - 1);

  return Array.from({ length: rowCount }, (_, index) => min + step * index);
};

const sanitizeRowPositions = (value: unknown, rowCount: number) => {
  const positions = Array.isArray(value)
    ? value
        .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
        .map((entry) => clamp(entry, 0, 1))
        .sort((left, right) => left - right)
    : [];

  if (positions.length === rowCount) {
    return positions;
  }

  if (positions.length >= 2) {
    return createDefaultRowPositions(rowCount, positions[0], positions[positions.length - 1]);
  }

  return createDefaultRowPositions(rowCount);
};

const parseTemplatePortableSnapshot = (value: unknown): TemplatePortableSnapshot | null => {
  if (!isObject(value)) {
    return null;
  }

  const looksTemplateLike =
    'name' in value || 'rowCount' in value || 'xPosition' in value || 'rowPositions' in value;
  if (!looksTemplateLike) {
    return null;
  }

  const rawRowCount =
    typeof value.rowCount === 'number' && Number.isFinite(value.rowCount)
      ? Math.trunc(value.rowCount)
      : 5;
  const rowCount = clamp(rawRowCount || 5, 1, 9);
  const xPosition =
    typeof value.xPosition === 'number' && Number.isFinite(value.xPosition)
      ? clamp(value.xPosition, 0, 1)
      : 0.07;

  return {
    name: sanitizeTemplateName(value.name),
    rowCount,
    xPosition,
    rowPositions: sanitizeRowPositions(value.rowPositions, rowCount),
  };
};

const parseTemplateStorageEntry = (value: unknown): (TemplatePortableSnapshot & { id?: string }) | null => {
  const snapshot = parseTemplatePortableSnapshot(value);
  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    id: isObject(value) && typeof value.id === 'string' && value.id.trim() ? value.id : undefined,
  };
};

const parseTemplatePortableSnapshots = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((entry) => parseTemplatePortableSnapshot(entry))
        .filter((entry): entry is TemplatePortableSnapshot => entry !== null)
    : [];

export const sanitizeTemplatePortableSnapshot = (template: Template) =>
  parseTemplatePortableSnapshot(template) ?? {
    name: TEMPLATE_NAME_FALLBACK,
    rowCount: 5,
    xPosition: 0.07,
    rowPositions: createDefaultRowPositions(5),
  };

export const parseTemplateImportDocument = (serialized: string): ParsedTemplateImportDocument => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('テンプレート JSON を読み込めませんでした');
  }

  if (isObject(parsed) && isObject(parsed.template)) {
    const template = parseTemplatePortableSnapshot(parsed.template);
    if (!template) {
      throw new Error('テンプレートの内容が不正です');
    }

    return {
      scope: 'single',
      templates: [template],
    };
  }

  if (isObject(parsed) && Array.isArray(parsed.templates)) {
    const templates = parseTemplatePortableSnapshots(parsed.templates);
    if (templates.length < 1) {
      throw new Error('読み込めるテンプレートが見つかりませんでした');
    }

    return {
      scope: templates.length === 1 ? 'single' : 'multiple',
      templates,
    };
  }

  if (Array.isArray(parsed)) {
    const templates = parseTemplatePortableSnapshots(parsed);
    if (templates.length < 1) {
      throw new Error('読み込めるテンプレートが見つかりませんでした');
    }

    return {
      scope: templates.length === 1 ? 'single' : 'multiple',
      templates,
    };
  }

  const template = parseTemplatePortableSnapshot(parsed);
  if (template) {
    return {
      scope: 'single',
      templates: [template],
    };
  }

  throw new Error('テンプレート形式の JSON ではありません');
};

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

const sanitizeFileNamePart = (value: string) =>
  stripControlCharacters(value).replace(/[<>:"/\\|?*]/g, '').trim() || 'template';

export const downloadSingleTemplateDocument = (template: Template) => {
  const payload: SingleTemplateDocument = {
    kind: SINGLE_TEMPLATE_KIND,
    version: TEMPLATE_DOCUMENT_VERSION,
    template: sanitizeTemplatePortableSnapshot(template),
  };
  const filename = `${sanitizeFileNamePart(payload.template.name)}.json`;
  downloadTextFile(filename, JSON.stringify(payload, null, 2));
};

export const downloadTemplateBundleDocument = (templates: Template[]) => {
  const payload: TemplateBundleDocument = {
    kind: TEMPLATE_BUNDLE_KIND,
    version: TEMPLATE_DOCUMENT_VERSION,
    templates: templates.map((template) => sanitizeTemplatePortableSnapshot(template)),
  };

  downloadTextFile('cutmark-templates.json', JSON.stringify(payload, null, 2));
};

export const sanitizeTemplateStorageValue = (value: unknown) => {
  const templates = Array.isArray(value)
    ? value
        .map((entry) => parseTemplateStorageEntry(entry))
        .filter((entry): entry is TemplatePortableSnapshot & { id?: string } => entry !== null)
    : [];
  return templates.length > 0 ? templates : [sanitizeTemplatePortableSnapshot({
    id: 'default',
    name: '標準5行',
    rowCount: 5,
    xPosition: 0.07,
    rowPositions: [0.0872, 0.2525, 0.4179, 0.5832, 0.7485],
  })];
};
