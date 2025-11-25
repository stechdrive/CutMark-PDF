
export interface Cut {
  id: string;
  pageIndex: number; // 0-based index
  x: number; // Percentage 0-1
  y: number; // Percentage 0-1
  label: string;
  isBranch: boolean; // True if it's an A/B/C cut
}

export interface Template {
  id: string;
  name: string;
  rowCount: number;
  xPosition: number; // Percentage 0-1
  rowPositions: number[]; // Array of Y percentages 0-1
}

export interface AppSettings {
  fontSize: number;
  useWhiteBackground: boolean;
  backgroundPadding: number;
  nextNumber: number;
  branchChar: string | null; // null if not branching, 'A', 'B' etc if branching
  autoIncrement: boolean;
  minDigits: number;
  textOutlineWidth: number; // Pixel width for white text outline
}

export interface PDFDimensions {
  width: number;
  height: number;
}