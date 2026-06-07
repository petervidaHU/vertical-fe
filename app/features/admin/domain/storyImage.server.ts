import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  STORY_IMAGE_MAX_BYTES,
  STORY_IMAGE_MAX_DIMENSION,
} from "./storyImage.shared";

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), "public", "uploads", "stories");
const DEFAULT_PUBLIC_URL_PREFIX = "/uploads/stories";
const MAX_INPUT_PIXELS = 20_000_000;
const OUTPUT_WEBP_QUALITY = 82;

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ACCEPTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
]);

type UploadedImage = Blob & {
  name?: string;
  size: number;
  type?: string;
};

type ManagedImageOptions = {
  fileNamePrefix?: string;
  publicUrlPrefix?: string;
  storageDir?: string;
};

async function readUploadedImageBytes(uploadedFile: UploadedImage): Promise<Uint8Array> {
  const fileWithArrayBuffer = uploadedFile as UploadedImage & {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof fileWithArrayBuffer.arrayBuffer === "function") {
    return new Uint8Array(await fileWithArrayBuffer.arrayBuffer());
  }

  if (typeof FileReader !== "undefined") {
    return new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("Unable to read the uploaded story image file."));
      };

      reader.onload = () => {
        if (!(reader.result instanceof ArrayBuffer)) {
          reject(new Error("Unable to read the uploaded story image file."));
          return;
        }

        resolve(new Uint8Array(reader.result));
      };

      reader.readAsArrayBuffer(uploadedFile);
    });
  }

  throw new Error("Unable to read the uploaded story image file.");
}

function isUploadedImage(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileNamePrefix(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "story-image";
}

function getManagedImagePath(
  imageUrl: string,
  publicUrlPrefix: string,
  storageDir: string,
): string | null {
  if (!imageUrl.startsWith(`${publicUrlPrefix}/`)) {
    return null;
  }

  const fileName = imageUrl.slice(publicUrlPrefix.length + 1);
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }

  return path.join(storageDir, fileName);
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

async function optimizeStoryImage(imageBytes: Uint8Array): Promise<Uint8Array> {
  const sharp = await import("sharp").then(m => m.default);
  const baseOptions = {
    failOn: "error" as const,
    limitInputPixels: MAX_INPUT_PIXELS,
  };

  const metadata = await sharp(imageBytes, baseOptions).metadata();

  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new Error("Story image must be a valid PNG, JPEG, or WebP file.");
  }

  const { data } = await sharp(imageBytes, baseOptions)
    .rotate()
    .resize({
      width: STORY_IMAGE_MAX_DIMENSION,
      height: STORY_IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      alphaQuality: 80,
      effort: 4,
      quality: OUTPUT_WEBP_QUALITY,
    })
    .toBuffer({ resolveWithObject: true });

  return data;
}

export function isStoryImageClearRequested(
  formData: FormData,
  fieldName = "removeImage",
): boolean {
  return String(formData.get(fieldName) ?? "") === "1";
}

export async function saveStoryImage(
  uploadedFile: FormDataEntryValue | null,
  options: ManagedImageOptions = {},
): Promise<string | null> {
  if (!isUploadedImage(uploadedFile)) {
    return null;
  }

  if (uploadedFile.size > STORY_IMAGE_MAX_BYTES) {
    throw new Error("Story image must be 8 MB or smaller.");
  }

  const mimeType = uploadedFile.type?.toLowerCase() ?? "";
  if (mimeType && !ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new Error("Story image must be a PNG, JPEG, or WebP file.");
  }

  let optimizedBytes: Uint8Array;

  try {
    optimizedBytes = await optimizeStoryImage(await readUploadedImageBytes(uploadedFile));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Story image must be a valid")) {
      throw error;
    }

    throw new Error("Story image must be a valid PNG, JPEG, or WebP file.");
  }

  const storageDir = options.storageDir ?? DEFAULT_STORAGE_DIR;
  const publicUrlPrefix = options.publicUrlPrefix ?? DEFAULT_PUBLIC_URL_PREFIX;
  const fileNamePrefix = sanitizeFileNamePrefix(options.fileNamePrefix ?? "story-image");
  const fileName = `${fileNamePrefix}-${randomUUID()}.webp`;

  await mkdir(storageDir, { recursive: true });
  await writeFile(path.join(storageDir, fileName), optimizedBytes);

  return `${publicUrlPrefix}/${fileName}`;
}

export async function deleteManagedStoryImage(
  imageUrl: string | null | undefined,
  options: ManagedImageOptions = {},
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const storageDir = options.storageDir ?? DEFAULT_STORAGE_DIR;
  const publicUrlPrefix = options.publicUrlPrefix ?? DEFAULT_PUBLIC_URL_PREFIX;
  const imagePath = getManagedImagePath(imageUrl, publicUrlPrefix, storageDir);

  if (!imagePath) {
    return;
  }

  try {
    await unlink(imagePath);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}