import { describe, expect, it, vi } from 'vitest';
import {
  adjustDpiForOrientation,
  applyExifOrientation,
  getExifOrientation,
  getImageResolution,
  getOrientedDimensions,
} from '../../services/imageProcessing';

const toArrayBuffer = (bytes: number[]) => Uint8Array.from(bytes).buffer;

const numberToBytes = (value: number, byteLength: number) => {
  const bytes = new Array<number>(byteLength);
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes[i] = value & 0xff;
    value >>= 8;
  }
  return bytes;
};

const buildTiffWithOrientation = (orientation: number) => [
  0x49, 0x49,
  0x2a, 0x00,
  0x08, 0x00, 0x00, 0x00,
  0x01, 0x00,
  0x12, 0x01,
  0x03, 0x00,
  0x01, 0x00, 0x00, 0x00,
  orientation, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
];

const buildJfifJpeg = (xDensity: number, yDensity: number, units = 1) =>
  toArrayBuffer([
    0xff, 0xd8,
    0xff, 0xe0,
    0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x02,
    units,
    ...numberToBytes(xDensity, 2),
    ...numberToBytes(yDensity, 2),
    0x00, 0x00,
    0xff, 0xd9,
  ]);

const buildExifJpeg = (orientation: number) => {
  const payload = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ...buildTiffWithOrientation(orientation),
  ];
  const length = payload.length + 2;

  return toArrayBuffer([
    0xff, 0xd8,
    0xff, 0xe1,
    ...numberToBytes(length, 2),
    ...payload,
    0xff, 0xd9,
  ]);
};

const buildPngChunk = (type: string, data: number[]) => [
  ...numberToBytes(data.length, 4),
  ...type.split('').map((char) => char.charCodeAt(0)),
  ...data,
  0x00, 0x00, 0x00, 0x00,
];

const buildPhysPng = (ppuX: number, ppuY: number) =>
  toArrayBuffer([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...buildPngChunk('pHYs', [
      ...numberToBytes(ppuX, 4),
      ...numberToBytes(ppuY, 4),
      0x01,
    ]),
    ...buildPngChunk('IEND', []),
  ]);

const buildExifPng = (orientation: number) =>
  toArrayBuffer([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...buildPngChunk('eXIf', [
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      ...buildTiffWithOrientation(orientation),
    ]),
    ...buildPngChunk('IEND', []),
  ]);

describe('imageProcessing helpers', () => {
  it('reads DPI from JFIF JPEG data', () => {
    const buffer = buildJfifJpeg(300, 300);

    expect(getImageResolution(buffer, 'jpeg')).toEqual({
      x: 300,
      y: 300,
    });
  });

  it('reads DPI from PNG pHYs metadata', () => {
    const buffer = buildPhysPng(3780, 3780);
    const dpi = getImageResolution(buffer, 'png');

    expect(dpi?.x).toBeCloseTo(96.012, 3);
    expect(dpi?.y).toBeCloseTo(96.012, 3);
  });

  it('reads EXIF orientation from JPEG and PNG metadata', () => {
    expect(getExifOrientation(buildExifJpeg(6), 'jpeg')).toBe(6);
    expect(getExifOrientation(buildExifPng(8), 'png')).toBe(8);
  });

  it('swaps dimensions and DPI only for rotated EXIF orientations', () => {
    expect(getOrientedDimensions(100, 200, 6)).toEqual({
      width: 200,
      height: 100,
    });
    expect(getOrientedDimensions(100, 200, 3)).toEqual({
      width: 100,
      height: 200,
    });

    expect(adjustDpiForOrientation({ x: 72, y: 144 }, 6)).toEqual({
      x: 144,
      y: 72,
    });
    expect(adjustDpiForOrientation({ x: 72, y: 144 }, 2)).toEqual({
      x: 72,
      y: 144,
    });
  });

  it('applies the expected canvas transform for rotated images', () => {
    const ctx = {
      transform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    applyExifOrientation(ctx, 6, 100, 200);

    expect(ctx.transform).toHaveBeenCalledWith(0, 1, -1, 0, 200, 0);
  });
});
