import type { PhotoInputSource, ResolvedPhotoInput } from "@/types/converter";

import {
  newInputId,
  validatePhotoBlob,
  type PhotoInputAdapter,
} from "./photo-input";

/**
 * Intake for the file picker and drag-and-drop. Both hand over a File;
 * only the recorded source differs.
 */
export interface FileUploadPayload {
  file: File;
}

function makeAdapter(
  source: Extract<PhotoInputSource, "file-upload" | "drag-and-drop">,
): PhotoInputAdapter<FileUploadPayload> {
  return {
    source,
    async resolve({ file }): Promise<ResolvedPhotoInput> {
      const { width, height } = await validatePhotoBlob(file);
      return {
        id: newInputId(),
        source,
        blob: file,
        mimeType: file.type,
        width,
        height,
        originalFilename: file.name || undefined,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

export const fileUploadAdapter = makeAdapter("file-upload");
export const dragAndDropAdapter = makeAdapter("drag-and-drop");
