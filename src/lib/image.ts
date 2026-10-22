// Browser-side image prep for uploads. The storage buckets take PNG/JPEG/WebP/
// GIF up to 5 MB; re-encoding here means any photo the browser can open (HEIC
// on Safari, huge camera JPEGs) arrives as a small JPEG the bucket accepts.

/** Thrown when the browser can't open the file as an image. */
export class UnreadableImageError extends Error {
  constructor() {
    super("UNREADABLE_IMAGE");
  }
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img>, which opens some formats createImageBitmap won't */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new UnreadableImageError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Scale so the longer side is at most `maxSide`, then encode as JPEG. */
export async function toJpeg(file: Blob, maxSide: number, quality = 0.85): Promise<Blob> {
  const src = await decode(file);
  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!w || !h) throw new UnreadableImageError();
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UnreadableImageError();
  // JPEG has no transparency: paint white under it instead of black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if ("close" in src) src.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new UnreadableImageError();
  return blob;
}
