"use client";

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 300 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

/**
 * Compresses an image in the browser before upload to keep request bodies
 * small. Falls back to the original file when compression isn't possible.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Animated GIFs can't be safely re-encoded through a canvas.
  if (file.type === "image/gif") return file;

  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.width, image.height),
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^/.]+$/, "")}.webp`;
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}
