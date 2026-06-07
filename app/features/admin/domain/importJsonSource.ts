async function readBlobText(uploadedFile: Blob): Promise<string> {
  const maybeReadableBlob = uploadedFile as Blob & {
    text?: () => Promise<string>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof maybeReadableBlob.text === "function") {
    return (await maybeReadableBlob.text()).trim();
  }

  if (typeof maybeReadableBlob.arrayBuffer === "function") {
    const buffer = await maybeReadableBlob.arrayBuffer();
    return new TextDecoder().decode(buffer).trim();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(new Error("Unable to read the uploaded .json file."));
      };
      reader.onload = () => {
        resolve(String(reader.result ?? "").trim());
      };
      reader.readAsText(uploadedFile);
    });
  }

  throw new Error("Unable to read the uploaded .json file.");
}

export async function readImportJsonSource(formData: FormData): Promise<string> {
  const pastedJson = String(formData.get("jsonText") ?? "").trim();

  if (pastedJson) {
    return pastedJson;
  }

  const uploadedFile = formData.get("jsonFile");

  if (!(uploadedFile instanceof Blob) || uploadedFile.size === 0) {
    throw new Error("Paste JSON text or select a non-empty .json file to import.");
  }

  const raw = await readBlobText(uploadedFile);

  if (!raw) {
    throw new Error("The uploaded .json file is empty.");
  }

  return raw;
}