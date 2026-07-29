import { HANDOFF_LIMITS, isAcceptedMimeType } from "@/shared/contracts/extension-handoff";
import type {
  ConversionErrorInfo,
  PhotoInputSource,
  ResolvedPhotoInput,
} from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

/**
 * The intake layer. Every way a photo can enter the converter — file
 * picker, drag-and-drop, Chrome extension, future saved creations or a
 * mobile share target — is an adapter that resolves to the one normalized
 * `ResolvedPhotoInput`. The wizard and the conversion providers only ever
 * see that shape; no source-specific logic leaks past this module.
 *
 * Every source passes the same validation. Extension-supplied metadata is
 * never trusted — the bytes are re-validated and re-decoded here exactly
 * like a local file.
 */
export interface PhotoInputAdapter<Payload> {
  readonly source: PhotoInputSource;
  resolve(payload: Payload): Promise<ResolvedPhotoInput>;
}

export class PhotoIntakeError extends Error {
  readonly info: ConversionErrorInfo;
  constructor(code: ConversionErrorInfo["code"], detail?: string) {
    const copy = CONVERTER_ERROR_COPY[code];
    super(detail ?? copy.heading);
    this.name = "PhotoIntakeError";
    this.info = { code, message: copy.heading };
  }
}

export function toIntakeError(error: unknown): PhotoIntakeError {
  if (error instanceof PhotoIntakeError) return error;
  return new PhotoIntakeError("corrupt-image");
}

/**
 * Shared validation: MIME allowlist, byte budget, real decode, dimension
 * and pixel budgets (decompression-bomb guard). Returns the decoded size
 * so no caller ever decodes twice.
 */
export async function validatePhotoBlob(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  if (!isAcceptedMimeType(blob.type)) {
    throw new PhotoIntakeError("unsupported-type");
  }
  if (blob.size > HANDOFF_LIMITS.maxBytes) {
    throw new PhotoIntakeError("file-too-large");
  }
  if (blob.size === 0) {
    throw new PhotoIntakeError("corrupt-image");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new PhotoIntakeError("corrupt-image");
  }
  const { width, height } = bitmap;
  bitmap.close();

  if (
    width < HANDOFF_LIMITS.minDimension ||
    height < HANDOFF_LIMITS.minDimension
  ) {
    throw new PhotoIntakeError("image-too-small");
  }
  if (
    width > HANDOFF_LIMITS.maxDimension ||
    height > HANDOFF_LIMITS.maxDimension ||
    width * height > HANDOFF_LIMITS.maxPixels
  ) {
    throw new PhotoIntakeError("image-too-large");
  }
  return { width, height };
}

export function newInputId(): string {
  return crypto.randomUUID();
}
