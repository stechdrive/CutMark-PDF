import {
  adjustDpiForOrientation,
  ExifOrientation,
} from './imageProcessing';

export type SupportedImageFileType = 'jpeg' | 'png';

export interface ImageFileMetadata {
  fileType: SupportedImageFileType | null;
  orientation: ExifOrientation | null;
  dpi: { x: number; y: number } | null;
}

const metadataCache = new WeakMap<File, Promise<ImageFileMetadata>>();

const detectImageFileType = (file: File): SupportedImageFileType | null => {
  const lowerName = file.name.toLowerCase();

  if (
    file.type === 'image/jpeg' ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg')
  ) {
    return 'jpeg';
  }

  if (file.type === 'image/png' || lowerName.endsWith('.png')) {
    return 'png';
  }

  return null;
};

const readExifInfoFromTiff = (
  view: DataView,
  tiffStart: number,
  dataEnd: number
): { orientation: ExifOrientation | null; dpi: { x: number; y: number } | null } => {
  if (tiffStart + 8 > dataEnd) return { orientation: null, dpi: null };

  const endian = view.getUint16(tiffStart);
  const isLittle = endian === 0x4949;
  if (!isLittle && endian !== 0x4d4d) return { orientation: null, dpi: null };

  if (view.getUint16(tiffStart + 2, isLittle) !== 0x002a) {
    return { orientation: null, dpi: null };
  }

  const firstIFDOffset = view.getUint32(tiffStart + 4, isLittle);
  if (firstIFDOffset < 8) return { orientation: null, dpi: null };

  const ifdOffset = tiffStart + firstIFDOffset;
  if (ifdOffset + 2 > dataEnd) return { orientation: null, dpi: null };

  const numEntries = view.getUint16(ifdOffset, isLittle);
  let orientation: ExifOrientation | null = null;
  let xRes: number | null = null;
  let yRes: number | null = null;
  let unit: number | null = null;

  for (let index = 0; index < numEntries; index++) {
    const entryOffset = ifdOffset + 2 + (index * 12);
    if (entryOffset + 12 > dataEnd) break;

    const tag = view.getUint16(entryOffset, isLittle);

    if (tag === 0x0112) {
      const type = view.getUint16(entryOffset + 2, isLittle);
      const count = view.getUint32(entryOffset + 4, isLittle);
      if (type === 3 && count >= 1) {
        const value = view.getUint16(entryOffset + 8, isLittle);
        if (value >= 1 && value <= 8) orientation = value as ExifOrientation;
      }
    } else if (tag === 0x011a || tag === 0x011b) {
      const type = view.getUint16(entryOffset + 2, isLittle);
      const valueOffset = view.getUint32(entryOffset + 8, isLittle);
      const valuePos = tiffStart + valueOffset;
      if (type === 5 && valuePos + 8 <= dataEnd) {
        const numerator = view.getUint32(valuePos, isLittle);
        const denominator = view.getUint32(valuePos + 4, isLittle);
        const value = denominator !== 0 ? numerator / denominator : 0;
        if (tag === 0x011a) xRes = value;
        else yRes = value;
      }
    } else if (tag === 0x0128) {
      unit = view.getUint16(entryOffset + 8, isLittle);
    }
  }

  let dpi: { x: number; y: number } | null = null;
  if (xRes && yRes && unit) {
    if (unit === 2) dpi = { x: xRes, y: yRes };
    if (unit === 3) dpi = { x: xRes * 2.54, y: yRes * 2.54 };
  }

  return { orientation, dpi };
};

const scanJpegMetadata = async (file: File) => {
  const header = await file.slice(0, 2).arrayBuffer();
  const headerView = new DataView(header);
  if (headerView.getUint16(0) !== 0xffd8) {
    return { dpi: null, orientation: null };
  }

  let offset = 2;
  let dpi: { x: number; y: number } | null = null;
  let orientation: ExifOrientation | null = null;

  while (offset + 4 <= file.size) {
    const segmentHeader = new DataView(await file.slice(offset, offset + 4).arrayBuffer());
    const marker = segmentHeader.getUint16(0);
    const length = segmentHeader.getUint16(2);

    if (marker === 0xffda || marker === 0xffd9) break;
    if (length < 2) break;

    const payloadStart = offset + 4;
    const payloadLength = length - 2;

    if (marker === 0xffe0 && !dpi) {
      const readLen = Math.min(payloadLength, 14);
      if (readLen >= 14) {
        const payload = new DataView(await file.slice(payloadStart, payloadStart + readLen).arrayBuffer());
        const isJfif =
          payload.getUint8(0) === 0x4a &&
          payload.getUint8(1) === 0x46 &&
          payload.getUint8(2) === 0x49 &&
          payload.getUint8(3) === 0x46 &&
          payload.getUint8(4) === 0x00;

        if (isJfif) {
          const units = payload.getUint8(7);
          const xDensity = payload.getUint16(8);
          const yDensity = payload.getUint16(10);
          if (units === 1) dpi = { x: xDensity, y: yDensity };
          if (units === 2) dpi = { x: xDensity * 2.54, y: yDensity * 2.54 };
        }
      }
    } else if (marker === 0xffe1) {
      const payload = new DataView(await file.slice(payloadStart, payloadStart + payloadLength).arrayBuffer());
      const hasExifHeader =
        payload.byteLength >= 6 &&
        payload.getUint8(0) === 0x45 &&
        payload.getUint8(1) === 0x78 &&
        payload.getUint8(2) === 0x69 &&
        payload.getUint8(3) === 0x66 &&
        payload.getUint16(4) === 0x0000;

      if (hasExifHeader) {
        const info = readExifInfoFromTiff(payload, 6, payload.byteLength);
        if (!orientation && info.orientation) orientation = info.orientation;
        if (!dpi && info.dpi) dpi = info.dpi;
      }
    }

    if (dpi && orientation) break;
    offset += 2 + length;
  }

  return { dpi, orientation };
};

const scanPngMetadata = async (file: File) => {
  const signature = new DataView(await file.slice(0, 8).arrayBuffer());
  const isPng =
    signature.getUint32(0) === 0x89504e47 &&
    signature.getUint32(4) === 0x0d0a1a0a;

  if (!isPng) {
    return { dpi: null, orientation: null };
  }

  let offset = 8;
  let dpi: { x: number; y: number } | null = null;
  let orientation: ExifOrientation | null = null;

  while (offset + 8 <= file.size) {
    const header = new DataView(await file.slice(offset, offset + 8).arrayBuffer());
    const length = header.getUint32(0);
    const chunkType = header.getUint32(4);
    const dataStart = offset + 8;

    if (chunkType === 0x49444154) break;

    if (chunkType === 0x70485973 && !dpi) {
      if (length >= 9) {
        const payload = new DataView(await file.slice(dataStart, dataStart + 9).arrayBuffer());
        const ppuX = payload.getUint32(0);
        const ppuY = payload.getUint32(4);
        const unit = payload.getUint8(8);
        if (unit === 1) {
          dpi = { x: ppuX * 0.0254, y: ppuY * 0.0254 };
        }
      }
    } else if (chunkType === 0x65584966) {
      const payload = new DataView(await file.slice(dataStart, dataStart + length).arrayBuffer());
      let tiffStart = 0;
      if (length >= 6) {
        const hasExifHeader =
          payload.getUint8(0) === 0x45 &&
          payload.getUint8(1) === 0x78 &&
          payload.getUint8(2) === 0x69 &&
          payload.getUint8(3) === 0x66 &&
          payload.getUint16(4) === 0x0000;
        if (hasExifHeader) tiffStart = 6;
      }

      const info = readExifInfoFromTiff(payload, tiffStart, payload.byteLength);
      if (!orientation && info.orientation) orientation = info.orientation;
      if (!dpi && info.dpi) dpi = info.dpi;
    }

    if (dpi && orientation) break;
    offset += 12 + length;
  }

  return { dpi, orientation };
};

export const getImageFileMetadata = async (file: File): Promise<ImageFileMetadata> => {
  const cached = metadataCache.get(file);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const fileType = detectImageFileType(file);
    if (!fileType) {
      return {
        fileType: null,
        orientation: null,
        dpi: null,
      };
    }

    const { dpi, orientation } =
      fileType === 'jpeg' ? await scanJpegMetadata(file) : await scanPngMetadata(file);

    return {
      fileType,
      orientation,
      dpi: adjustDpiForOrientation(dpi, orientation),
    };
  })();

  metadataCache.set(file, pending);
  return pending;
};
