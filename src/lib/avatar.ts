/** Reads an image file and returns a small square data URL we can store on the profile. */
export async function fileToAvatarDataUrl(file: File, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}
