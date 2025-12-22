
import { PDFDocument, rgb, StandardFonts, PDFOperator, PDFName, PDFNumber, PDFPage } from 'pdf-lib';
import { Cut, AppSettings } from '../types';
import {
  adjustDpiForOrientation,
  getExifOrientation,
  getImageResolution,
  renderImageWithOrientation,
} from './imageProcessing';

// Helper to draw cuts on a page (Shared logic)
const drawCutsOnPage = async (page: PDFPage, pageIndex: number, cuts: Cut[], settings: AppSettings, font: any, scaleFactor: number = 1.0) => {
  const { width, height } = page.getSize();
  const pageCuts = cuts.filter(c => c.pageIndex === pageIndex);

  for (const cut of pageCuts) {
    // Save Graphics State to ensure isolation between cuts and from page content
    page.pushOperators(PDFOperator.of('q' as any));

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
      PDFOperator.of('BMC' as any, [PDFName.of('Span')])
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
       page.pushOperators(PDFOperator.of('q' as any));
       page.pushOperators(PDFOperator.of('Tr' as any, [PDFNumber.of(3)])); // Tr 3 = Stroke, no fill (but usually for text we want just stroke here)
       // Actually mode 3 is "Neither fill nor stroke" if not careful? No, mode 3 is Invisible.
       // Mode 1 is Stroke, Mode 2 is Fill and Stroke. 
       // We want stroke only for the outline layer underneath. Mode 1.
       page.pushOperators(PDFOperator.of('Tr' as any, [PDFNumber.of(1)]));
       page.pushOperators(PDFOperator.of('w' as any, [PDFNumber.of(outlineWidth * 2)]));
       page.pushOperators(PDFOperator.of('RG' as any, [PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)])); // White stroke
       page.pushOperators(PDFOperator.of('j' as any, [PDFNumber.of(1)])); // Round join
       page.pushOperators(PDFOperator.of('J' as any, [PDFNumber.of(1)])); // Round cap

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
       page.pushOperators(PDFOperator.of('Q' as any));
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
      PDFOperator.of('EMC' as any)
    );

    // Restore Graphics State
    page.pushOperators(PDFOperator.of('Q' as any));
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

    // Try to detect DPI and scale down if found
    if (imgType) {
      const res = getImageResolution(arrayBuffer, imgType);
      const adjustedRes = adjustDpiForOrientation(res, orientation);
      if (adjustedRes && adjustedRes.x > 0 && adjustedRes.y > 0) {
        // PDF standard is 72 points per inch
        // Scale = 72 / DPI
        const scaleX = 72 / adjustedRes.x;
        const scaleY = 72 / adjustedRes.y;
        
        drawWidth = image.width * scaleX;
        drawHeight = image.height * scaleY;
        
        // Use Y scale (height) as reference for font scaling
        scaleFactor = scaleY;
      }
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
