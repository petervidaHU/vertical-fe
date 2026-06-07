import { afterEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  deleteManagedStoryImage,
  saveStoryImage,
} from "./storyImage.server";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "story-image-"));
  tempDirs.push(tempDir);
  return tempDir;
}

async function createPngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 54, g: 99, b: 199, alpha: 1 },
    },
  }).png().toBuffer();
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true })));
});

describe("storyImage", () => {
  it("stores an uploaded story image as optimized webp", async () => {
    const storageDir = await createTempDir();
    const source = await createPngBuffer(2400, 1200);

    const imageUrl = await saveStoryImage(
      new File([source], "aurora.png", { type: "image/png" }),
      {
        fileNamePrefix: "story-123",
        publicUrlPrefix: "/uploads/stories",
        storageDir,
      },
    );

    expect(imageUrl).toMatch(/^\/uploads\/stories\/story-123-[0-9a-f-]+\.webp$/);

    const fileName = imageUrl?.split("/").at(-1);
    expect(fileName).toBeTruthy();

    const optimizedBytes = await readFile(path.join(storageDir, String(fileName)));
    const metadata = await sharp(optimizedBytes).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1600);
  });

  it("rejects unsupported image types", async () => {
    const storageDir = await createTempDir();

    await expect(
      saveStoryImage(new File(["text-data"], "story.txt", { type: "text/plain" }), {
        storageDir,
      }),
    ).rejects.toThrow("Story image must be a PNG, JPEG, or WebP file.");
  });

  it("deletes managed uploaded story images without touching arbitrary paths", async () => {
    const storageDir = await createTempDir();
    const source = await createPngBuffer(320, 240);
    const imageUrl = await saveStoryImage(
      new File([source], "story.png", { type: "image/png" }),
      {
        publicUrlPrefix: "/uploads/stories",
        storageDir,
      },
    );

    const fileName = imageUrl?.split("/").at(-1);
    expect(fileName).toBeTruthy();

    await deleteManagedStoryImage(imageUrl, {
      publicUrlPrefix: "/uploads/stories",
      storageDir,
    });

    await expect(readFile(path.join(storageDir, String(fileName)))).rejects.toMatchObject({ code: "ENOENT" });
  });
});