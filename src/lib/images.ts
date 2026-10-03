// Client-side image helpers: validate, downscale and compress to WebP before upload.
import { MAX_IMAGE_BYTES } from "@/config/site";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // phone photos are big; we compress below MAX_IMAGE_BYTES

export async function compressImage(file: File, maxSide = 1280): Promise<Blob> {
  if (!ALLOWED.includes(file.type)) throw new Error("Use a JPG, PNG or WebP image");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Image is too large (max 15MB)");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
  }
  throw new Error("Image is still over 5MB after compression");
}
