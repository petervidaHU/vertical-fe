import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EPIC_BACKGROUND_IMAGE_MAX_BYTES } from "./epicBackgroundImage.shared";

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), "public", "uploads", "epics");
const DEFAULT_PUBLIC_URL_PREFIX = "/uploads/epics";

const MIME_EXTENSION_MAP = new Map<string, string>([
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
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
        reject(new Error("Unable to read the uploaded image file."));
      };

      reader.onload = () => {
        if (!(reader.result instanceof ArrayBuffer)) {
          reject(new Error("Unable to read the uploaded image file."));
          return;
        }

        resolve(new Uint8Array(reader.result));
      };

      reader.readAsArrayBuffer(uploadedFile);
    });
  }

  throw new Error("Unable to read the uploaded image file.");
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

  return sanitized || "epic-bg";
}

function resolveImageExtension(uploadedFile: UploadedImage): string | null {
  const mimeType = uploadedFile.type?.toLowerCase() ?? "";
  const byMime = MIME_EXTENSION_MAP.get(mimeType);

  if (byMime) {
    return byMime;
  }

  const fileName = uploadedFile.name?.toLowerCase() ?? "";
  if (fileName.endsWith(".png")) return "png";
  if (fileName.endsWith(".webp")) return "webp";
  if (fileName.endsWith(".svg")) return "svg";

  return null;
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

export function isEpicBackgroundImageClearRequested(
  formData: FormData,
  fieldName = "removeBackgroundImage",
): boolean {
  return String(formData.get(fieldName) ?? "") === "1";
}

export async function saveEpicBackgroundImage(
  uploadedFile: FormDataEntryValue | null,
  options: ManagedImageOptions = {},
): Promise<string | null> {
  if (!isUploadedImage(uploadedFile)) {
    return null;
  }

  if (uploadedFile.size > EPIC_BACKGROUND_IMAGE_MAX_BYTES) {
    throw new Error("Epic background image must be 1 MB or smaller.");
  }

  const extension = resolveImageExtension(uploadedFile);
  if (!extension) {
    throw new Error("Epic background image must be a PNG, WebP, or SVG file.");
  }

  const storageDir = options.storageDir ?? DEFAULT_STORAGE_DIR;
  const publicUrlPrefix = options.publicUrlPrefix ?? DEFAULT_PUBLIC_URL_PREFIX;
  const fileNamePrefix = sanitizeFileNamePrefix(options.fileNamePrefix ?? "epic-bg");
  const fileName = `${fileNamePrefix}-${randomUUID()}.${extension}`;

  await mkdir(storageDir, { recursive: true });
  await writeFile(
    path.join(storageDir, fileName),
    await readUploadedImageBytes(uploadedFile),
  );

  return `${publicUrlPrefix}/${fileName}`;
}

export async function deleteManagedEpicBackgroundImage(
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
