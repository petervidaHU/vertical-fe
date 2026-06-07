import { afterEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  deleteManagedEpicBackgroundImage,
  saveEpicBackgroundImage,
} from "./epicBackgroundImage.server";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "epic-bg-"));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true })));
});

describe("epicBackgroundImage", () => {
  it("stores a supported uploaded image in the configured directory", async () => {
    const storageDir = await createTempDir();

    const imageUrl = await saveEpicBackgroundImage(
      new File(["png-data"], "cloud.png", { type: "image/png" }),
      {
        fileNamePrefix: "epic-123",
        publicUrlPrefix: "/uploads/epics",
        storageDir,
      },
    );

    expect(imageUrl).toMatch(/^\/uploads\/epics\/epic-123-[0-9a-f-]+\.png$/);

    const fileName = imageUrl?.split("/").at(-1);
    expect(fileName).toBeTruthy();
    await expect(readFile(path.join(storageDir, String(fileName)), "utf8")).resolves.toBe("png-data");
  });

  it("rejects unsupported image types", async () => {
    const storageDir = await createTempDir();

    await expect(
      saveEpicBackgroundImage(new File(["gif-data"], "cloud.gif", { type: "image/gif" }), {
        storageDir,
      }),
    ).rejects.toThrow("Epic background image must be a PNG, WebP, or SVG file.");
  });

  it("deletes managed uploaded images without touching arbitrary paths", async () => {
    const storageDir = await createTempDir();
    const filePath = path.join(storageDir, "cloud.png");

    await writeFile(filePath, "cloud-data");
    await deleteManagedEpicBackgroundImage("/uploads/epics/cloud.png", {
      publicUrlPrefix: "/uploads/epics",
      storageDir,
    });

    await expect(readFile(filePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
