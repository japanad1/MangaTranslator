import { TranslationZone } from "./types";

// Helper to generate a random ID
export function generateId(): string {
  return "zone_" + Math.random().toString(36).substr(2, 9);
}

// Draw wrapped text inside a bounding box on the canvas
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  zone: TranslationZone,
  fontFamily: string
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  const padding = zone.padding;
  const maxWidth = w - padding * 2;

  // Configure text properties
  const fontStyle = `${zone.italic ? "italic" : ""} ${zone.bold ? "bold" : ""} ${zone.fontSize}px ${fontFamily}`;
  ctx.font = fontStyle;
  ctx.fillStyle = zone.fontColor;
  ctx.textBaseline = "middle";

  // Check word widths and wrap
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate line height and total height
  const lineHeight = zone.fontSize * 1.25;
  const totalTextHeight = lines.length * lineHeight;

  // Determine starting Y position based on vertical alignment
  let startY = y + padding;
  if (zone.verticalAlign === "center") {
    startY = y + (h - totalTextHeight) / 2;
  } else if (zone.verticalAlign === "bottom") {
    startY = y + h - totalTextHeight - padding;
  }

  // Draw lines
  lines.forEach((line, index) => {
    const lineY = startY + index * lineHeight + lineHeight / 2;
    const lineWidth = ctx.measureText(line).width;
    
    // Determine starting X position based on text alignment
    let lineX = x + padding;
    if (zone.textAlign === "center") {
      lineX = x + (w - lineWidth) / 2;
      ctx.textAlign = "center";
      ctx.fillText(line, x + w / 2, lineY);
    } else if (zone.textAlign === "right") {
      ctx.textAlign = "right";
      ctx.fillText(line, x + w - padding, lineY);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(line, lineX, lineY);
    }
  });
}

// Promisified image loading
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
}

// Programmatic High-Resolution Manga Export
export async function exportMangaAsImage(
  originalImageUrl: string,
  zones: TranslationZone[],
  fileName: string = "translated_manga.png"
): Promise<void> {
  try {
    const image = await loadImage(originalImageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    // Clear and draw original manga image in native high-res
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Map fonts
    const fontFamilies: Record<string, string> = {
      sans: '"Inter", sans-serif',
      comic: '"Comic Neue", cursive, sans-serif',
      bangers: '"Bangers", sans-serif',
      architect: '"Architects Daughter", cursive, sans-serif',
    };

    // Draw active translation overlays scale-mapped back to physical coordinates
    zones.forEach((zone) => {
      // Calculate physical pixels from normalized coordinates
      const x = (zone.xmin / 1000) * canvas.width;
      const y = (zone.ymin / 1000) * canvas.height;
      const w = ((zone.xmax - zone.xmin) / 1000) * canvas.width;
      const h = ((zone.ymax - zone.ymin) / 1000) * canvas.height;

      ctx.save();
      
      // Calculate center to support rotating about center point
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      
      // Rotate if needed
      if (zone.rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((zone.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Configure general opacity
      ctx.globalAlpha = zone.opacity / 100;

      // Draw speech bubble background
      if (zone.backgroundColor && zone.backgroundColor !== "transparent") {
        ctx.fillStyle = zone.backgroundColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, h, zone.borderRadius);
        } else {
          // Fallback rect if roundRect isn't supported
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
      }

      // Draw speech bubble border
      if (zone.borderWidth > 0 && zone.borderColor && zone.borderColor !== "transparent") {
        ctx.strokeStyle = zone.borderColor;
        ctx.lineWidth = zone.borderWidth;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, h, zone.borderRadius);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.stroke();
      }

      // Draw the translated text
      const family = fontFamilies[zone.borderWidth > 2 ? "comic" : "comic"] || '"Comic Neue", sans-serif'; 
      // Choose custom family based on preset style or defaults
      let chosenFont = '"Comic Neue", sans-serif';
      if (zone.fontSize > 35) {
        chosenFont = '"Bangers", sans-serif';
      } else if (zone.italic && !zone.bold) {
        chosenFont = '"Architects Daughter", sans-serif';
      } else if (zone.borderRadius === 0) {
        chosenFont = '"Inter", sans-serif';
      }

      drawWrappedText(ctx, zone.translatedText || zone.originalText, x, y, w, h, zone, chosenFont);

      ctx.restore();
    });

    // Create a link to download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Failed to export canvas image:", err);
    alert("Export failed. Please try again.");
  }
}

// Compress and scale high-resolution manga image to optimal dimensions to fit Vercel body limits
export function compressMangaImage(base64Str: string, maxDim: number = 1000): Promise<string> {
  return new Promise((resolve) => {
    // If not a base64 image or too short, return as-is
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      // If the image is already small, we still convert to JPEG to reduce base64 size (since JPEG encodes much smaller than PNG)
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      // Use jpeg format with 0.82 quality to shrink file size from MBs down to ~120KB - 250KB
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      console.log(`[Image Compress] Original: ${Math.round(base64Str.length / 1024)}KB, Compressed: ${Math.round(compressed.length / 1024)}KB`);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

