
import { PDFDocument, rgb, StandardFonts, PDFOperator, PDFName, PDFNumber } from 'pdf-lib';
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

    // Start Marked Content Group (BMC /Span)
    // This tells Acrobat that the following elements belong together
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
      // Center the line within the max width box
      const xOffset = (maxTextWidth - lw) / 2;
      
      const lineX = rectX + padding + xOffset;
      // drawText baseline logic
      const lineY = boxTopY - padding - (textSize * 0.88) - (index * lineHeight);
      
      return { text: line, x: lineX, y: lineY };
    });

    // Draw Outline (Native Stroke)
    // Instead of drawing text multiple times, we use PDF render mode 1 (Stroke)
    // with a thick line width.
    if (settings.textOutlineWidth > 0) {
       // Save graphics state
       page.pushOperators(PDFOperator.of('q' as any));
       
       // Set Text Rendering Mode to 1 (Stroke only)
       page.pushOperators(PDFOperator.of('Tr' as any, [PDFNumber.of(1)]));
       
       // Set Line Width (outline width * 2 because stroke is centered on path)
       page.pushOperators(PDFOperator.of('w' as any, [PDFNumber.of(settings.textOutlineWidth * 2)]));
       
       // Set Stroke Color to White (DeviceRGB 1 1 1)
       page.pushOperators(PDFOperator.of('RG' as any, [PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)]));
       
       // Set Line Join (1=Round) and Line Cap (1=Round) to avoid sharp spikes
       page.pushOperators(PDFOperator.of('j' as any, [PDFNumber.of(1)]));
       page.pushOperators(PDFOperator.of('J' as any, [PDFNumber.of(1)]));

       // Draw all lines as stroke
       for (const linePos of linePositions) {
         page.drawText(linePos.text, {
            x: linePos.x,
            y: linePos.y,
            size: textSize,
            font: helveticaFont,
            color: rgb(0, 0, 0), // Color is ignored by Tr 1 (uses RG), but required by API
         });
       }
       
       // Restore graphics state (resets Render Mode to 0, Line Width, Color, etc.)
       page.pushOperators(PDFOperator.of('Q' as any));
    }

    // Draw Main Text (Fill)
    // Standard drawText uses Render Mode 0 (Fill)
    for (const linePos of linePositions) {
      page.drawText(linePos.text, {
        x: linePos.x,
        y: linePos.y,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }

    // End Marked Content Group
    page.pushOperators(
      PDFOperator.of('EMC' as any)
    );
  }

  return await pdfDoc.save();
};
