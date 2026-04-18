import { ProjectDocument } from '../domain/project';

export const PROJECT_FILE_EXTENSION = '.cutmark';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value: unknown, message: string): asserts value is string {
  assert(typeof value === 'string', message);
}

function assertNumber(value: unknown, message: string): asserts value is number {
  assert(typeof value === 'number' && Number.isFinite(value), message);
}

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  assert(typeof value === 'boolean', message);
}

export function assertIsProjectDocument(
  value: unknown
): asserts value is ProjectDocument {
  assert(isObject(value), 'Project document must be an object');
  assert(value.version === 1, 'Unsupported project version');

  assert(isObject(value.meta), 'Project meta must be an object');
  assertString(value.meta.name, 'Project meta.name must be a string');
  assertString(value.meta.savedAt, 'Project meta.savedAt must be a string');

  assert(Array.isArray(value.logicalPages), 'Project logicalPages must be an array');
  value.logicalPages.forEach((page, pageIndex) => {
    assert(isObject(page), `Logical page ${pageIndex} must be an object`);
    assertString(page.id, `Logical page ${pageIndex}.id must be a string`);
    assert(Array.isArray(page.cuts), `Logical page ${pageIndex}.cuts must be an array`);
    page.cuts.forEach((cut, cutIndex) => {
      assert(isObject(cut), `Cut ${pageIndex}:${cutIndex} must be an object`);
      assertString(cut.id, `Cut ${pageIndex}:${cutIndex}.id must be a string`);
      assertNumber(cut.x, `Cut ${pageIndex}:${cutIndex}.x must be a number`);
      assertNumber(cut.y, `Cut ${pageIndex}:${cutIndex}.y must be a number`);
      assertString(cut.label, `Cut ${pageIndex}:${cutIndex}.label must be a string`);
      assertBoolean(cut.isBranch, `Cut ${pageIndex}:${cutIndex}.isBranch must be a boolean`);
    });
  });

  assert(isObject(value.numbering), 'Project numbering must be an object');
  assertNumber(value.numbering.nextNumber, 'Project numbering.nextNumber must be a number');
  assert(
    typeof value.numbering.branchChar === 'string' || value.numbering.branchChar === null,
    'Project numbering.branchChar must be a string or null'
  );
  assertBoolean(value.numbering.autoIncrement, 'Project numbering.autoIncrement must be a boolean');
  assertNumber(value.numbering.minDigits, 'Project numbering.minDigits must be a number');

  assert(isObject(value.style), 'Project style must be an object');
  assertNumber(value.style.fontSize, 'Project style.fontSize must be a number');
  assertBoolean(value.style.useWhiteBackground, 'Project style.useWhiteBackground must be a boolean');
  assertNumber(value.style.backgroundPadding, 'Project style.backgroundPadding must be a number');
  assertNumber(value.style.textOutlineWidth, 'Project style.textOutlineWidth must be a number');
  assertBoolean(
    value.style.enableClickSnapToRows,
    'Project style.enableClickSnapToRows must be a boolean'
  );

  assert(isObject(value.template), 'Project template must be an object');
  assertString(value.template.id, 'Project template.id must be a string');
  assertString(value.template.name, 'Project template.name must be a string');
  assertNumber(value.template.rowCount, 'Project template.rowCount must be a number');
  assertNumber(value.template.xPosition, 'Project template.xPosition must be a number');
  assert(Array.isArray(value.template.rowPositions), 'Project template.rowPositions must be an array');
  value.template.rowPositions.forEach((rowPosition, index) => {
    assertNumber(rowPosition, `Project template.rowPositions[${index}] must be a number`);
  });
}

const cloneProjectDocument = (project: ProjectDocument): ProjectDocument =>
  JSON.parse(JSON.stringify(project)) as ProjectDocument;

export const serializeProjectDocument = (project: ProjectDocument) =>
  JSON.stringify(project, null, 2);

export const parseProjectDocument = (serialized: string): ProjectDocument => {
  const parsed = JSON.parse(serialized) as unknown;
  assertIsProjectDocument(parsed);
  return cloneProjectDocument(parsed);
};

export const createProjectDownloadFileName = (name: string) => {
  const normalized = name
    .trim()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0 && code <= 31) return '-';
      if ('<>:"/\\|?*'.includes(char)) return '-';
      return char;
    })
    .join('');
  const safeBaseName = normalized.length > 0 ? normalized : 'cutmark-project';
  return safeBaseName.endsWith(PROJECT_FILE_EXTENSION)
    ? safeBaseName
    : `${safeBaseName}${PROJECT_FILE_EXTENSION}`;
};

export const downloadProjectDocument = (
  project: ProjectDocument,
  fileName = createProjectDownloadFileName(project.meta.name)
) => {
  const blob = new Blob([serializeProjectDocument(project)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const loadProjectDocumentFromFile = async (file: File) =>
  parseProjectDocument(await file.text());
