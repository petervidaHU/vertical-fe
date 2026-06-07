import { describe, expect, it } from "@jest/globals";
import { readImportJsonSource } from "./importJsonSource";

describe("readImportJsonSource", () => {
  it("prefers pasted JSON text when both textarea and file are provided", async () => {
    const formData = new FormData();
    formData.set("jsonText", " {\"stories\": []} ");
    formData.set("jsonFile", new File(["{\"stories\":[{\"title\":\"Ignored\"}]}"], "stories.json", { type: "application/json" }));

    await expect(readImportJsonSource(formData)).resolves.toBe("{\"stories\": []}");
  });

  it("falls back to the uploaded file when textarea is empty", async () => {
    const formData = new FormData();
    formData.set("jsonFile", new File([" {\"epics\": []} "], "epics.json", { type: "application/json" }));

    await expect(readImportJsonSource(formData)).resolves.toBe("{\"epics\": []}");
  });

  it("throws when neither textarea nor file input has import JSON", async () => {
    const formData = new FormData();

    await expect(readImportJsonSource(formData)).rejects.toThrow(
      "Paste JSON text or select a non-empty .json file to import.",
    );
  });
});