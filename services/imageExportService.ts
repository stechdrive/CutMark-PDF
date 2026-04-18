import { downloadZip } from 'client-zip';
import { createCutsByPageIndex } from '../application/cutPageIndex';
import { Cut, AppSettings } from '../types';
import {
  applyExifOrientation,
  getOrientedDimensions,
  loadImageSource,
  setBlobDpi,
} from './imageProcessing';
import { getImageFileMetadata } from './imageMetadata';
import { saveZipResponse } from './zipDownload';

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

export const exportImagesAsZip = async (
  imageFiles: File[],
  cuts: Cut[],
  settings: AppSettings,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const total = imageFiles.length;
  const cutsByPageIndex = createCutsByPageIndex(cuts);

  const buildEntries = async function* () {
    for (let i = 0; i < total; i++) {
      const file = imageFiles[i];
      if (onProgress) onProgress(i + 1, total);

      const metadata = await getImageFileMetadata(file);
      if (!metadata.fileType) {
        continue;
      }

      const fileType = metadata.fileType;
      const orientation = metadata.orientation;
      const adjustedDpi = metadata.dpi;

      const { source, width: sourceWidth, height: sourceHeight, cleanup } = await loadImageSource(file);
      const { width, height } = getOrientedDimensions(sourceWidth, sourceHeight, orientation);

      canvas.width = width;
      canvas.height = height;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      applyExifOrientation(ctx, orientation, sourceWidth, sourceHeight);
      ctx.drawImage(source, 0, 0);
      ctx.restore();

      const pageCuts = cutsByPageIndex.get(i) ?? [];
      const textSize = settings.fontSize;
      ctx.font = `bold ${textSize}px Helvetica, Arial, sans-serif`;
      ctx.textBaseline = 'top';

      for (const cut of pageCuts) {
        const lines = cut.label.split('\n');

        let maxTextWidth = 0;
        const lineMetrics = lines.map((line) => {
          const measured = ctx.measureText(line);
          const width = measured.width;
          if (width > maxTextWidth) maxTextWidth = width;
          return { text: line, width };
        });

        const padding = settings.backgroundPadding;
        const lineHeight = textSize;
        const boxWidth = maxTextWidth + (padding * 2);
        const boxHeight = (lines.length * lineHeight) + (padding * 2);
        const boxTopY = cut.y * height;
        const rectX = (cut.x * width) - (boxWidth / 2);
        const rectY = boxTopY;

        if (settings.useWhiteBackground) {
          ctx.fillStyle = 'white';
          ctx.fillRect(rectX, rectY, boxWidth, boxHeight);
        }

        lines.forEach((line, lineIndex) => {
          const lineWidth = lineMetrics[lineIndex].width;
          const xOffset = (maxTextWidth - lineWidth) / 2;
          const lineX = rectX + padding + xOffset;
          const lineY = rectY + padding + (lineIndex * lineHeight);

          if (settings.textOutlineWidth > 0) {
            ctx.lineWidth = settings.textOutlineWidth * 2;
            ctx.strokeStyle = 'white';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeText(line, lineX, lineY);
          }

          ctx.fillStyle = 'black';
          ctx.fillText(line, lineX, lineY);
        });
      }

      cleanup?.();

      const isPng = fileType === 'png';
      let blob = await new Promise<Blob | null>((resolve) => {
        if (isPng) {
          canvas.toBlob(resolve, 'image/png');
        } else {
          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        }
      });

      if (!blob) {
        continue;
      }

      if (adjustedDpi) {
        blob = await setBlobDpi(blob, adjustedDpi, isPng ? 'png' : 'jpeg');
      }

      yield {
        name: file.name,
        lastModified: new Date(file.lastModified),
        input: blob.stream(),
      };

      await yieldToBrowser();
    }
  };

  const zipResponse = downloadZip(buildEntries());
  return saveZipResponse(zipResponse, 'marked_images.zip');
};
