
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Cut, AppSettings } from '../types';

export const saveMarkedPdf = async (
  originalPdfBytes: ArrayBuffer,
  cuts: Cut[],
  settings: AppSettings
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();

  for (const cut of cuts) {
    if (cut.pageIndex >= pages.length) continue;

    const page = pages[cut.pageIndex];
    const { width, height } = page.getSize();

    // Dimensions
    const textSize = settings.fontSize;
    const padding = settings.backgroundPadding;
    
    // We use textSize as the line height to match HTML's lineHeight: 1
    const lineHeight = textSize;
    
    // Handle multiline text (e.g. Branch labels)
    const lines = cut.label.split('\n');
    const lineWidths = lines.map(line => helveticaFont.widthOfTextAtSize(line, textSize));
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
      // Center the line within the max width box
      const xOffset = (maxTextWidth - lw) / 2;
      
      const lineX = rectX + padding + xOffset;
      // drawText baseline logic
      const lineY = boxTopY - padding - (textSize * 0.88) - (index * lineHeight);
      
      return { text: line, x: lineX, y: lineY };
    });

    // Draw Outline (Fake Stroke via multi-pass drawing)
    // Must draw ALL outlines first to avoid covering fills of other lines
    if (settings.textOutlineWidth > 0) {
       const outlineW = settings.textOutlineWidth;
       const steps = outlineW < 2 ? 8 : 16;
       
       for (const linePos of linePositions) {
         for (let i = 0; i < steps; i++) {
           const angle = (i / steps) * 2 * Math.PI;
           const ox = Math.cos(angle) * outlineW;
           const oy = Math.sin(angle) * outlineW;
           
           page.drawText(linePos.text, {
              x: linePos.x + ox,
              y: linePos.y + oy,
              size: textSize,
              font: helveticaFont,
              color: rgb(1, 1, 1), // White outline
           });
         }
       }
    }

    // Draw Main Text
    for (const linePos of linePositions) {
      page.drawText(linePos.text, {
        x: linePos.x,
        y: linePos.y,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save();
};
