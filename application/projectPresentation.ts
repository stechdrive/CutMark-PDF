import { ProjectDocument } from '../domain/project';
import { AppSettings, Template } from '../types';

export const createAppSettingsFromProjectDocument = (
  project: ProjectDocument
): AppSettings => ({
  fontSize: project.style.fontSize,
  useWhiteBackground: project.style.useWhiteBackground,
  backgroundPadding: project.style.backgroundPadding,
  nextNumber: project.numbering.nextNumber,
  branchChar: project.numbering.branchChar,
  autoIncrement: project.numbering.autoIncrement,
  minDigits: project.numbering.minDigits,
  textOutlineWidth: project.style.textOutlineWidth,
  enableClickSnapToRows: project.style.enableClickSnapToRows,
});

export const createTemplateFromProjectDocument = (
  project: ProjectDocument
): Template => ({
  id: project.template.id,
  name: project.template.name,
  rowCount: project.template.rowCount,
  xPosition: project.template.xPosition,
  rowPositions: [...project.template.rowPositions],
});
