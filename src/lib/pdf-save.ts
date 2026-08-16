import type { jsPDF } from "jspdf";

type NativeResult = { method: "shared" | "saved"; path?: string };

function capacitor(): { isNativePlatform?: () => boolean } | undefined {
  return (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
}

/** True inside the Capacitor Android/iOS WebView (never in a normal browser). */
export function isNativeApp() {
  try {
    return Boolean(capacitor()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function toBase64(doc: jsPDF) {
  const uri = doc.output("datauristring");
  return uri.slice(uri.indexOf(",") + 1);
}

/**
 * Android WebViews ignore `<a download>`, so on native we write the PDF to the
 * device and hand it to the share/save sheet. Browsers keep the normal download.
 */
export async function savePdfDocument(doc: jsPDF, filename: string): Promise<NativeResult> {
  if (!isNativeApp()) {
    doc.save(filename);
    return { method: "saved" };
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const data = toBase64(doc);
  const directories = [Directory.Documents, Directory.External, Directory.Cache];
  let written: { directory: (typeof directories)[number]; uri: string } | null = null;
  let lastError: unknown = null;

  for (const directory of directories) {
    try {
      // No `encoding` on purpose: Capacitor then treats `data` as base64 binary.
      const result = await Filesystem.writeFile({
        path: filename,
        data,
        directory,
        recursive: true,
      });
      written = { directory, uri: result.uri };
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!written) throw lastError ?? new Error("Could not write the PDF to this device");

  try {
    await Share.share({
      title: "Study tracker record",
      text: filename,
      url: written.uri,
      dialogTitle: "Save or share your tracker PDF",
    });
    return { method: "shared", path: written.uri };
  } catch {
    // User dismissed the sheet (or no share target) — the file is still saved.
    return { method: "saved", path: written.uri };
  }
}
