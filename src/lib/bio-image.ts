import sharp from "sharp";

export const MAX_BIO_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB upload limit
export const TARGET_BIO_IMAGE_SIZE = 250 * 1024; // 250 KB

export interface ProcessedBioImage {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

/**
 * Validates and compresses an uploaded bio gallery image.
 * Images larger than the target size are converted to WebP and
 * progressively compressed before being uploaded to storage.
 */
export async function processBioImage(file: File): Promise<ProcessedBioImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file");
  }

  if (file.size > MAX_BIO_IMAGE_SIZE) {
    throw new Error("File size should be less than 5MB");
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());

  if (file.size <= TARGET_BIO_IMAGE_SIZE) {
    return {
      buffer: originalBuffer,
      contentType: file.type,
      fileName: file.name,
    };
  }

  let quality = 85;
  let width = 1200;

  let processedBuffer = await sharp(originalBuffer)
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  while (processedBuffer.length > TARGET_BIO_IMAGE_SIZE && quality > 30) {
    quality -= 10;
    processedBuffer = await sharp(originalBuffer)
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  while (processedBuffer.length > TARGET_BIO_IMAGE_SIZE && width > 400) {
    width -= 200;
    quality = Math.max(quality, 50);
    processedBuffer = await sharp(originalBuffer)
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  if (processedBuffer.length > TARGET_BIO_IMAGE_SIZE) {
    processedBuffer = await sharp(originalBuffer)
      .resize({
        width: 400,
        height: 400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 40 })
      .toBuffer();
  }

  return {
    buffer: processedBuffer,
    contentType: "image/webp",
    fileName: `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
  };
}
