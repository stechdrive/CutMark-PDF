import { AppSettings, Cut, Template } from '../types';

export const createAppSettings = (
  overrides: Partial<AppSettings> = {}
): AppSettings => ({
  fontSize: 28,
  useWhiteBackground: false,
  backgroundPadding: 4,
  nextNumber: 1,
  branchChar: null,
  autoIncrement: true,
  minDigits: 3,
  textOutlineWidth: 2,
  enableClickSnapToRows: true,
  ...overrides,
});

export const createTemplate = (
  overrides: Partial<Template> = {}
): Template => ({
  id: 'default',
  name: '標準5行',
  rowCount: 5,
  xPosition: 0.07,
  rowPositions: [0.0872, 0.2525, 0.4179, 0.5832, 0.7485],
  ...overrides,
});

export const createCut = (overrides: Partial<Cut> = {}): Cut => ({
  id: 'cut-1',
  pageIndex: 0,
  x: 0.1,
  y: 0.1,
  label: '001',
  isBranch: false,
  ...overrides,
});
