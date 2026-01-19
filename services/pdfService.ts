
import { PDFDocument, rgb, StandardFonts, PDFOperator, PDFName, PDFNumber, PDFPage, PDFFont, PDFOperatorNames } from 'pdf-lib';
import { Cut, AppSettings } from '../types';
import {
  adjustDpiForOrientation,
  getExifOrientation,
  ExifOrientation,
  renderImageWithOrientation,
} from './imageProcessing';

// Helper to draw cuts on a page (Shared logic)
const drawCutsOnPage = async (
  page: PDFPage,
  pageIndex: number,
  cuts: Cut[],
  settings: AppSettings,
  font: PDFFont,
  scaleFactor: number = 1.0
) => {
  const { width, height } = page.getSize();
  const pageCuts = cuts.filter(c => c.pageIndex === pageIndex);

  for (const cut of pageCuts) {
    // Save Graphics State to ensure isolation between cuts and from page content
    page.pushOperators(PDFOperator.of(PDFOperatorNames.PushGraphicsState));

    // Dimensions (Scaled by DPI factor)
    // When the page size is scaled down (e.g. for high DPI), we must also scale down the font and padding
    // so that the text size relative to the image content remains the same as in the browser preview.
    const textSize = settings.fontSize * scaleFactor;
    const padding = settings.backgroundPadding * scaleFactor;
    const outlineWidth = settings.textOutlineWidth * scaleFactor;
    
    // We use textSize as the line height to match HTML's lineHeight: 1
    const lineHeight = textSize;
    
    // Handle multiline text (e.g. Branch labels)
    const lines = cut.label.split('\n');
    const lineWidths = lines.map(line => font.widthOfTextAtSize(line, textSize));
    const maxTextWidth = Math.max(...lineWidths);

    const boxWidth = maxTextWidth + (padding * 2);
    const boxHeight = (lines.length * lineHeight) + (padding * 2);

    // Coordinate conversion
    // State: Top-Left (0-1)
    // cut.y is the TOP edge of the box
    // cut.x is the CENTER of the box
    
    // 1. Calculate the PDF Y coordinate for the TOP of the box
    const boxTopY = height - (cut.y * height);
    
    // 2. Calculate the PDF coordinates for the Rectangle (drawn from bottom-left)
    // Since cut.x is center, we subtract half width from the x position
    const rectX = (cut.x * width) - (boxWidth / 2);
    const rectY = boxTopY - boxHeight;

    // Start Marked Content Group (BMC /Span)
    page.pushOperators(
      PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Span')])
    );

    // Draw Background (Zabuton) if enabled
    if (settings.useWhiteBackground) {
      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
      });
    }

    // Pre-calculate line positions for center alignment
    const linePositions = lines.map((line, index) => {
      const lw = lineWidths[index];
      const xOffset = (maxTextWidth - lw) / 2;
      const lineX = rectX + padding + xOffset;
      const lineY = boxTopY - padding - (textSize * 0.88) - (index * lineHeight);
      
      return { text: line, x: lineX, y: lineY };
    });

    // Draw Outline (Native Stroke)
    if (settings.textOutlineWidth > 0) {
       page.pushOperators(PDFOperator.of(PDFOperatorNames.PushGraphicsState));
       page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(3)])); // Tr 3 = Stroke, no fill (but usually for text we want just stroke here)
       // Actually mode 3 is "Neither fill nor stroke" if not careful? No, mode 3 is Invisible.
       // Mode 1 is Stroke, Mode 2 is Fill and Stroke. 
       // We want stroke only for the outline layer underneath. Mode 1.
       page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(1)]));
       page.pushOperators(PDFOperator.of(PDFOperatorNames.SetLineWidth, [PDFNumber.of(outlineWidth * 2)]));
       page.pushOperators(PDFOperator.of(PDFOperatorNames.StrokingColorRgb, [PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)])); // White stroke
       page.pushOperators(PDFOperator.of(PDFOperatorNames.SetLineJoinStyle, [PDFNumber.of(1)])); // Round join
       page.pushOperators(PDFOperator.of(PDFOperatorNames.SetLineCapStyle, [PDFNumber.of(1)])); // Round cap

       for (const linePos of linePositions) {
         page.drawText(linePos.text, {
            x: linePos.x,
            y: linePos.y,
            size: textSize,
            font: font,
            color: rgb(0, 0, 0), // Color doesn't matter for stroke mode if set by RG? drawText might reset it. 
            // drawText in pdf-lib usually sets color operators. 
            // To be safe with outline, drawing same text twice (stroke then fill) is standard.
            // But pdf-lib's drawText resets text state.
         });
       }
       page.pushOperators(PDFOperator.of(PDFOperatorNames.PopGraphicsState));
    }

    // Draw Main Text (Fill)
    for (const linePos of linePositions) {
      page.drawText(linePos.text, {
        x: linePos.x,
        y: linePos.y,
        size: textSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // End Marked Content Group
    page.pushOperators(
      PDFOperator.of(PDFOperatorNames.EndMarkedContent)
    );

    // Restore Graphics State
    page.pushOperators(PDFOperator.of(PDFOperatorNames.PopGraphicsState));
  }
};

export const saveMarkedPdf = async (
  originalPdfBytes: ArrayBuffer,
  cuts: Cut[],
  settings: AppSettings
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    // For original PDF, we assume 1:1 scale (browser view usually matches PDF points)
    await drawCutsOnPage(pages[i], i, cuts, settings, helveticaFont, 1.0);
  }

  return await pdfDoc.save();
};

export const saveImagesAsPdf = async (
  imageFiles: File[],
  cuts: Cut[],
  settings: AppSettings
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const DEFAULT_DPI = 96;
  const POINTS_PER_INCH = 72;
  const DPI_TOLERANCE = 0.01;

  const normalizeDpi = (dpi: { x: number; y: number }) => ({
    x: Math.round(dpi.x * 100) / 100,
    y: Math.round(dpi.y * 100) / 100,
  });

  const isSameDpi = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) <= DPI_TOLERANCE && Math.abs(a.y - b.y) <= DPI_TOLERANCE;

  const readExifInfoFromTiff = (
    view: DataView,
    tiffStart: number,
    dataEnd: number
  ): { orientation: ExifOrientation | null; dpi: { x: number; y: number } | null } => {
    if (tiffStart + 8 > dataEnd) return { orientation: null, dpi: null };

    const endian = view.getUint16(tiffStart);
    const isLittle = endian === 0x4949; // 'II'
    if (!isLittle && endian !== 0x4D4D) return { orientation: null, dpi: null }; // 'MM'

    if (view.getUint16(tiffStart + 2, isLittle) !== 0x002A) {
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

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12);
      if (entryOffset + 12 > dataEnd) break;

      const tag = view.getUint16(entryOffset, isLittle);

      if (tag === 0x0112) {
        const type = view.getUint16(entryOffset + 2, isLittle); // 3 = SHORT
        const count = view.getUint32(entryOffset + 4, isLittle);
        if (type === 3 && count >= 1) {
          const value = view.getUint16(entryOffset + 8, isLittle);
          if (value >= 1 && value <= 8) orientation = value as ExifOrientation;
        }
      } else if (tag === 0x011A || tag === 0x011B) {
        const type = view.getUint16(entryOffset + 2, isLittle); // 5 = RATIONAL
        const valueOffset = view.getUint32(entryOffset + 8, isLittle);
        const valuePos = tiffStart + valueOffset;
        if (type === 5 && valuePos + 8 <= dataEnd) {
          const numerator = view.getUint32(valuePos, isLittle);
          const denominator = view.getUint32(valuePos + 4, isLittle);
          const val = denominator !== 0 ? numerator / denominator : 0;
          if (tag === 0x011A) xRes = val;
          else yRes = val;
        }
      } else if (tag === 0x0128) {
        const val = view.getUint16(entryOffset + 8, isLittle);
        unit = val;
      }
    }

    let dpi: { x: number; y: number } | null = null;
    if (xRes && yRes && unit) {
      if (unit === 2) dpi = { x: xRes, y: yRes }; // Inches
      if (unit === 3) dpi = { x: xRes * 2.54, y: yRes * 2.54 }; // Centimeters
    }

    return { orientation, dpi };
  };

  const scanJpegMetadata = async (file: File): Promise<{ dpi: { x: number; y: number } | null; orientation: ExifOrientation | null }> => {
    const header = await file.slice(0, 2).arrayBuffer();
    const headerView = new DataView(header);
    if (headerView.getUint16(0) !== 0xFFD8) return { dpi: null, orientation: null };

    let offset = 2;
    let dpi: { x: number; y: number } | null = null;
    let orientation: ExifOrientation | null = null;

    while (offset + 4 <= file.size) {
      const segHeader = new DataView(await file.slice(offset, offset + 4).arrayBuffer());
      const marker = segHeader.getUint16(0);
      const length = segHeader.getUint16(2);

      if (marker === 0xFFDA || marker === 0xFFD9) break; // SOS / EOI
      if (length < 2) break;

      const payloadStart = offset + 4;
      const payloadLength = length - 2;

      if (marker === 0xFFE0 && !dpi) {
        // JFIF からDPIを読む
        const readLen = Math.min(payloadLength, 14);
        if (readLen >= 14) {
          const payload = new DataView(await file.slice(payloadStart, payloadStart + readLen).arrayBuffer());
          const isJfif =
            payload.getUint8(0) === 0x4A &&
            payload.getUint8(1) === 0x46 &&
            payload.getUint8(2) === 0x49 &&
            payload.getUint8(3) === 0x46 &&
            payload.getUint8(4) === 0x00;
          if (isJfif) {
            const units = payload.getUint8(9);
            const xDensity = payload.getUint16(10);
            const yDensity = payload.getUint16(12);
            if (units === 1) dpi = { x: xDensity, y: yDensity };
            if (units === 2) dpi = { x: xDensity * 2.54, y: yDensity * 2.54 };
          }
        }
      } else if (marker === 0xFFE1) {
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

  const scanPngMetadata = async (file: File): Promise<{ dpi: { x: number; y: number } | null; orientation: ExifOrientation | null }> => {
    const signature = new DataView(await file.slice(0, 8).arrayBuffer());
    const isPng =
      signature.getUint32(0) === 0x89504E47 &&
      signature.getUint32(4) === 0x0D0A1A0A;
    if (!isPng) return { dpi: null, orientation: null };

    let offset = 8;
    let dpi: { x: number; y: number } | null = null;
    let orientation: ExifOrientation | null = null;

    while (offset + 8 <= file.size) {
      const header = new DataView(await file.slice(offset, offset + 8).arrayBuffer());
      const length = header.getUint32(0);
      const chunkType = header.getUint32(4);
      const dataStart = offset + 8;

      if (chunkType === 0x49444154) break; // IDAT

      if (chunkType === 0x70485973 && !dpi) {
        // pHYs からDPIを読む
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

  const scanImageMetadata = async (
    file: File
  ): Promise<{ dpi: { x: number; y: number } | null; orientation: ExifOrientation | null }> => {
    let imgType: 'jpeg' | 'png' | null = null;
    const lowerName = file.name.toLowerCase();

    if (file.type === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      imgType = 'jpeg';
    } else if (file.type === 'image/png' || lowerName.endsWith('.png')) {
      imgType = 'png';
    }

    if (!imgType) return { dpi: null, orientation: null };

    return imgType === 'jpeg' ? scanJpegMetadata(file) : scanPngMetadata(file);
  };

  let baseDpi: { x: number; y: number } | null = null;
  let hasMixedDpi = false;

  for (const file of imageFiles) {
    const { dpi, orientation } = await scanImageMetadata(file);
    const adjusted = adjustDpiForOrientation(dpi, orientation);
    if (!adjusted || adjusted.x <= 0 || adjusted.y <= 0) {
      hasMixedDpi = true;
      break;
    }
    const normalized = normalizeDpi(adjusted);
    if (!baseDpi) {
      baseDpi = normalized;
      continue;
    }
    if (!isSameDpi(baseDpi, normalized)) {
      hasMixedDpi = true;
      break;
    }
  }

  const effectiveDpi = hasMixedDpi || !baseDpi ? { x: DEFAULT_DPI, y: DEFAULT_DPI } : baseDpi;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const arrayBuffer = await file.arrayBuffer();
    
    let image;
    let imgType: 'jpeg' | 'png' | null = null;

    if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      imgType = 'jpeg';
    } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      imgType = 'png';
    } else {
      continue; // Skip unsupported
    }

    const orientation = getExifOrientation(arrayBuffer, imgType);

    let imageBytes: ArrayBuffer = arrayBuffer;
    if (orientation && orientation !== 1) {
      const rendered = await renderImageWithOrientation(file, orientation, imgType);
      imageBytes = await rendered.blob.arrayBuffer();
    }

    if (imgType === 'jpeg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (imgType === 'png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      continue;
    }
    
    // Default to image pixel dimensions (72dpi equivalent)
    let drawWidth = image.width;
    let drawHeight = image.height;
    let scaleFactor = 1.0;

    const dpiX = effectiveDpi.x;
    const dpiY = effectiveDpi.y;
    if (dpiX > 0 && dpiY > 0) {
      // PDF standard is 72 points per inch
      // Scale = 72 / DPI
      const scaleX = POINTS_PER_INCH / dpiX;
      const scaleY = POINTS_PER_INCH / dpiY;
      
      drawWidth = image.width * scaleX;
      drawHeight = image.height * scaleY;
      
      // Use Y scale (height) as reference for font scaling
      scaleFactor = scaleY;
    }

    // Create page with calculated dimensions
    const page = pdfDoc.addPage([drawWidth, drawHeight]);
    
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: drawWidth,
      height: drawHeight,
    });

    // Draw cuts (Editable Vector Text)
    // Pass scaleFactor so text sizes are visually consistent with the scaled image
    await drawCutsOnPage(page, i, cuts, settings, helveticaFont, scaleFactor);
  }

  return await pdfDoc.save();
};
