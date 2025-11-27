
// Helper to extract DPI from image buffer
export const getImageResolution = (buffer: ArrayBuffer, type: 'jpeg' | 'png'): { x: number, y: number } | null => {
  const view = new DataView(buffer);

  try {
    if (type === 'jpeg') {
      // Check SOI (FF D8)
      if (view.getUint16(0) !== 0xFFD8) return null;

      let offset = 2;
      while (offset < view.byteLength) {
        // Prevent out of bounds
        if (offset + 4 > view.byteLength) break;

        const marker = view.getUint16(offset);
        const length = view.getUint16(offset + 2);

        // APP0 (JFIF) = FF E0
        if (marker === 0xFFE0) {
          // Check for "JFIF\0" identifier at offset + 4
          // J=74, F=70, I=73, F=70, \0=00
          if (
            view.getUint8(offset + 4) === 0x4A &&
            view.getUint8(offset + 5) === 0x46 &&
            view.getUint8(offset + 6) === 0x49 &&
            view.getUint8(offset + 7) === 0x46 &&
            view.getUint8(offset + 8) === 0x00
          ) {
            const units = view.getUint8(offset + 13);
            const xDensity = view.getUint16(offset + 14);
            const yDensity = view.getUint16(offset + 16);

            if (units === 1) { // dots per inch
              return { x: xDensity, y: yDensity };
            } else if (units === 2) { // dots per cm
              return { x: xDensity * 2.54, y: yDensity * 2.54 };
            }
          }
        }
        
        // APP1 (Exif) = FF E1
        if (marker === 0xFFE1) {
           // Check for "Exif\0\0" identifier
           if (
            view.getUint8(offset + 4) === 0x45 && // E
            view.getUint8(offset + 5) === 0x78 && // x
            view.getUint8(offset + 6) === 0x69 && // i
            view.getUint8(offset + 7) === 0x66 && // f
            view.getUint16(offset + 8) === 0x0000 // \0\0
           ) {
              const tiffStart = offset + 10;
              
              // Prevent OOB
              if (tiffStart + 8 > view.byteLength) break;

              // Byte Order
              const endian = view.getUint16(tiffStart); 
              const isLittle = endian === 0x4949; // 'II'

              // Check TIFF magic number 42 (0x002A)
              if (view.getUint16(tiffStart + 2, isLittle) !== 0x002A) {
                  offset += 2 + length;
                  continue; 
              }

              const firstIFDOffset = view.getUint32(tiffStart + 4, isLittle);
              if (firstIFDOffset < 8) {
                   offset += 2 + length;
                   continue;
              }

              let ifdOffset = tiffStart + firstIFDOffset;
              if (ifdOffset + 2 > view.byteLength) break;

              const numEntries = view.getUint16(ifdOffset, isLittle);
              
              let xRes: number | null = null;
              let yRes: number | null = null;
              let unit: number | null = null; // 2 = inches, 3 = cm

              for (let i = 0; i < numEntries; i++) {
                  const entryOffset = ifdOffset + 2 + (i * 12);
                  if (entryOffset + 12 > view.byteLength) break;

                  const tag = view.getUint16(entryOffset, isLittle);
                  
                  // 0x011A = XResolution, 0x011B = YResolution (RATIONAL)
                  // 0x0128 = ResolutionUnit (SHORT)
                  
                  if (tag === 0x011A || tag === 0x011B) {
                      const type = view.getUint16(entryOffset + 2, isLittle); // 5 = RATIONAL
                      // valueOffset points to data relative to tiffStart
                      const valueOffset = view.getUint32(entryOffset + 8, isLittle);
                      
                      if (type === 5) {
                          const numerator = view.getUint32(tiffStart + valueOffset, isLittle);
                          const denominator = view.getUint32(tiffStart + valueOffset + 4, isLittle);
                          const val = denominator !== 0 ? numerator / denominator : 0;
                          
                          if (tag === 0x011A) xRes = val;
                          else yRes = val;
                      }
                  } else if (tag === 0x0128) {
                      const type = view.getUint16(entryOffset + 2, isLittle); // 3 = SHORT
                      // For SHORT(3), if count=1, value is in the first 2 bytes of the 4-byte offset field
                      const val = view.getUint16(entryOffset + 8, isLittle);
                      unit = val;
                  }
              }

              if (xRes && yRes && unit) {
                  if (unit === 2) return { x: xRes, y: yRes }; // Inches
                  if (unit === 3) return { x: xRes * 2.54, y: yRes * 2.54 }; // Centimeters
              }
           }
        }
        
        offset += 2 + length;
      }
    } else if (type === 'png') {
      // Skip signature (8 bytes)
      let offset = 8;
      while (offset < view.byteLength) {
        if (offset + 8 > view.byteLength) break;
        
        const length = view.getUint32(offset);
        const chunkType = view.getUint32(offset + 4);
        
        // 'pHYs' = 0x70485973
        if (chunkType === 0x70485973) {
          const ppuX = view.getUint32(offset + 8);
          const ppuY = view.getUint32(offset + 12);
          const unit = view.getUint8(offset + 16);
          
          if (unit === 1) { // meter
            // Convert pixels per meter to pixels per inch
            // 1 inch = 0.0254 meters
            return {
              x: ppuX * 0.0254,
              y: ppuY * 0.0254
            };
          }
          return null;
        }
        
        offset += 12 + length; // Length(4) + Type(4) + Data(length) + CRC(4)
      }
    }
  } catch (e) {
    console.warn("Failed to parse image resolution", e);
  }
  return null;
};

// CRC32 implementation for PNG chunks
const makeCrcTable = () => {
    let c;
    const crcTable = [];
    for(let n =0; n < 256; n++){
      c = n;
      for(let k =0; k < 8; k++){
        c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    return crcTable;
}
const crcTable = makeCrcTable();
export const crc32 = (buf: Uint8Array): number => {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++ ) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};

// Helper to inject DPI into Blob
export const setBlobDpi = async (blob: Blob, dpi: {x: number, y: number}, type: 'jpeg' | 'png'): Promise<Blob> => {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    
    if (type === 'jpeg') {
        if (view.getUint16(0) !== 0xFFD8) return blob; // Check SOI
        
        // 1. Check for existing APP0 JFIF at offset 2
        const marker = view.getUint16(2);
        
        if (marker === 0xFFE0) {
             // Check identifier "JFIF\0"
             if (view.getUint8(6) === 0x4A && 
                 view.getUint8(7) === 0x46 && 
                 view.getUint8(8) === 0x49 && 
                 view.getUint8(9) === 0x46 && 
                 view.getUint8(10) === 0x00) {
                 
                 // Found JFIF. Overwrite it.
                 view.setUint8(13, 1); // Unit: dots per inch
                 view.setUint16(14, Math.round(dpi.x)); // X Density
                 view.setUint16(16, Math.round(dpi.y)); // Y Density
                 return new Blob([buffer], { type: 'image/jpeg' });
             }
        }
        
        // 2. If no JFIF at start (either other marker like Exif, or just missing), insert a new APP0 JFIF segment
        // Construct standard JFIF segment (18 bytes)
        const jfifSegment = new Uint8Array(18);
        const jView = new DataView(jfifSegment.buffer);
        
        jView.setUint16(0, 0xFFE0); // APP0 Marker
        jView.setUint16(2, 16);     // Length
        
        // Identifier 'JFIF\0'
        jfifSegment[4] = 0x4A; 
        jfifSegment[5] = 0x46; 
        jfifSegment[6] = 0x49; 
        jfifSegment[7] = 0x46; 
        jfifSegment[8] = 0x00; 
        
        jView.setUint8(9, 1);  // Major version
        jView.setUint8(10, 1); // Minor version
        jView.setUint8(11, 1); // Units: dots per inch
        jView.setUint16(12, Math.round(dpi.x)); // X density
        jView.setUint16(14, Math.round(dpi.y)); // Y density
        jView.setUint8(16, 0); // Thumb width
        jView.setUint8(17, 0); // Thumb height
        
        // Insert after SOI (2 bytes)
        const newBuffer = new Uint8Array(uint8.length + 18);
        newBuffer.set(uint8.slice(0, 2), 0); // SOI
        newBuffer.set(jfifSegment, 2);       // JFIF
        newBuffer.set(uint8.slice(2), 20);   // Rest
        
        return new Blob([newBuffer], { type: 'image/jpeg' });

    } else if (type === 'png') {
        // Insert pHYs chunk before IDAT or after IHDR
        // We generally assume IHDR ends at byte 33 (8 sig + 25 IHDR).
        // 1 inch = 0.0254 meters
        const ppmX = Math.round(dpi.x / 0.0254);
        const ppmY = Math.round(dpi.y / 0.0254);
        
        // Data payload (9 bytes)
        const data = new Uint8Array(9);
        const dataView = new DataView(data.buffer);
        dataView.setUint32(0, ppmX);
        dataView.setUint32(4, ppmY);
        dataView.setUint8(8, 1); // Unit: meter
        
        // Chunk Header + Data for CRC
        const chunkType = new Uint8Array([112, 72, 89, 115]); // 'pHYs'
        const crcInput = new Uint8Array(4 + 9);
        crcInput.set(chunkType, 0);
        crcInput.set(data, 4);
        
        const crc = crc32(crcInput);
        const crcBytes = new Uint8Array(4);
        new DataView(crcBytes.buffer).setUint32(0, crc);
        
        const lenBytes = new Uint8Array(4);
        new DataView(lenBytes.buffer).setUint32(0, 9); // Length of data
        
        // Construct new PNG
        // Standard IHDR is always first chunk. Length=13, Type=IHDR. Total 12+13=25 bytes.
        // Signature is 8 bytes. So IHDR ends at 8+25=33.
        const insertPos = 33; 
        
        const newSize = uint8.length + 4 + 4 + 9 + 4; // Len + Type + Data + CRC
        const newBuf = new Uint8Array(newSize);
        
        newBuf.set(uint8.slice(0, insertPos), 0);
        newBuf.set(lenBytes, insertPos);
        newBuf.set(chunkType, insertPos + 4);
        newBuf.set(data, insertPos + 8);
        newBuf.set(crcBytes, insertPos + 17);
        newBuf.set(uint8.slice(insertPos), insertPos + 21);
        
        return new Blob([newBuf], { type: 'image/png' });
    }
    
    return blob;
};
