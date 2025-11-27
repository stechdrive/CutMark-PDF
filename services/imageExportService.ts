
import JSZip from 'jszip';
import { Cut, AppSettings } from '../types';
import { getImageResolution, setBlobDpi } from './imageProcessing';

// Native browser download function
const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportImagesAsZip = async (
  imageFiles: File[],
  cuts: Cut[],
  settings: AppSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const zip = new JSZip();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const total = imageFiles.length;

  for (let i = 0; i < total; i++) {
    const file = imageFiles[i];
    if (onProgress) onProgress(i + 1, total);
    
    // Check Original DPI
    const originalBuffer = await file.arrayBuffer();
    const fileType = file.type === 'image/png' ? 'png' : 'jpeg';
    const originalDpi = getImageResolution(originalBuffer, fileType);

    // Create Bitmap
    let imageBitmap: ImageBitmap | HTMLImageElement;
    let width: number;
    let height: number;

    try {
        imageBitmap = await createImageBitmap(file);
        width = imageBitmap.width;
        height = imageBitmap.height;
    } catch (e) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
        imageBitmap = img;
        width = img.naturalWidth;
        height = img.naturalHeight;
        URL.revokeObjectURL(url);
    }

    // Resize canvas
    canvas.width = width;
    canvas.height = height;

    // Draw Image
    ctx.drawImage(imageBitmap, 0, 0);

    // Draw Cuts
    const pageCuts = cuts.filter(c => c.pageIndex === i);
    
    // We use the raw pixel size of the image, so we use the raw fontSize setting.
    // In the viewer, the image is scaled (CSS transform), but the CutMarker element uses settings.fontSize (px).
    // This means the text size relative to the image pixels depends on the image size.
    // e.g. 12px font on 1000px height image is 1.2%.
    // In canvas, we draw 12px font on 1000px height image. It matches.
    const textSize = settings.fontSize;
    ctx.font = `bold ${textSize}px Helvetica, Arial, sans-serif`;
    ctx.textBaseline = 'top';

    for (const cut of pageCuts) {
        const lines = cut.label.split('\n');
        
        // Measure text
        let maxTextWidth = 0;
        const lineMetrics = lines.map(line => {
            const m = ctx.measureText(line);
            const w = m.width;
            if (w > maxTextWidth) maxTextWidth = w;
            return { text: line, width: w };
        });

        const padding = settings.backgroundPadding;
        const lineHeight = textSize;
        const boxWidth = maxTextWidth + (padding * 2);
        const boxHeight = (lines.length * lineHeight) + (padding * 2);

        // Calculate position
        const boxTopY = cut.y * height;
        const rectX = (cut.x * width) - (boxWidth / 2);
        const rectY = boxTopY;

        // Draw Background
        if (settings.useWhiteBackground) {
            ctx.fillStyle = 'white';
            ctx.fillRect(rectX, rectY, boxWidth, boxHeight);
        }

        // Draw Text
        lines.forEach((line, lineIndex) => {
            const lw = lineMetrics[lineIndex].width;
            const xOffset = (maxTextWidth - lw) / 2;
            const lineX = rectX + padding + xOffset;
            const lineY = rectY + padding + (lineIndex * lineHeight);

            // Draw Outline
            if (settings.textOutlineWidth > 0) {
                ctx.lineWidth = settings.textOutlineWidth * 2;
                ctx.strokeStyle = 'white';
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.strokeText(line, lineX, lineY);
            }

            // Draw Fill
            ctx.fillStyle = 'black';
            ctx.fillText(line, lineX, lineY);
        });
    }

    // Cleanup
    if (imageBitmap instanceof ImageBitmap) {
        imageBitmap.close();
    }

    // Convert to Blob
    const isPng = file.type === 'image/png';
    let blob = await new Promise<Blob | null>(resolve => {
        if (isPng) {
            canvas.toBlob(resolve, 'image/png');
        } else {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        }
    });

    // Inject DPI
    if (blob && originalDpi) {
        blob = await setBlobDpi(blob, originalDpi, isPng ? 'png' : 'jpeg');
    }

    if (blob) {
        zip.file(file.name, blob);
    }
  }

  // Generate ZIP
  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, `marked_images.zip`);
};
