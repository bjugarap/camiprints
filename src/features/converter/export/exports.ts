/**
 * Export helpers for the finished page. The PDF is a real US Letter
 * document (A4 users print it "fit to page" — the handoff's paper label
 * covers this) with the artwork centred inside the same 0.5in safe margin
 * the print stylesheet uses. No branding, no watermark.
 */
const LETTER = { width: 612, height: 792 }; // points
const MARGIN = 36; // 0.5in

export async function pngToLetterPdf(png: Blob): Promise<Blob> {
  // pdf-lib loads on first use — it must not weigh down the wizard route.
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(await png.arrayBuffer());

  const landscape = image.width > image.height;
  const pageW = landscape ? LETTER.height : LETTER.width;
  const pageH = landscape ? LETTER.width : LETTER.height;
  const page = doc.addPage([pageW, pageH]);

  const boxW = pageW - MARGIN * 2;
  const boxH = pageH - MARGIN * 2;
  const scale = Math.min(boxW / image.width, boxH / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  page.drawImage(image, {
    x: (pageW - drawW) / 2,
    y: (pageH - drawH) / 2,
    width: drawW,
    height: drawH,
  });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
