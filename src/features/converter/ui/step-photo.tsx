"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import type {
  ConversionErrorInfo,
  ResolvedPhotoMeta,
} from "@/types/converter";
import { CONVERTER_ERROR_COPY } from "@/types/converter";

/**
 * Step 1 · Photo. A photo can arrive by picker, drag-and-drop or the
 * Chrome-extension handoff — this step only shows the normalized result.
 * The rights confirmation is required for every source; the extension
 * never bypasses it.
 */
export function StepPhoto({
  photo,
  photoUrl,
  rightsConfirmed,
  error,
  onPickFile,
  onDropFile,
  onReplace,
  onRightsChange,
  onNext,
}: {
  photo: ResolvedPhotoMeta | null;
  photoUrl: string | null;
  rightsConfirmed: boolean;
  error: ConversionErrorInfo | null;
  onPickFile: (file: File) => void;
  onDropFile: (file: File) => void;
  onReplace: () => void;
  onRightsChange: (confirmed: boolean) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const filePicker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      aria-label="Choose a photo"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onPickFile(file);
        event.target.value = "";
      }}
    />
  );

  if (!photo || !photoUrl) {
    return (
      <div className="mx-auto max-w-[560px]">
        <h2 className="text-subsection text-ink">Add a photo</h2>
        <p className="mt-1.5 text-base/[1.5] text-ink-60">
          A clear photo with one main subject works best.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border-[1.5px] border-error bg-card p-4"
          >
            <p className="font-display text-lg font-bold text-error">
              {CONVERTER_ERROR_COPY[error.code].heading}
            </p>
            <p className="mt-1 text-[15px]/[1.5] text-ink-60">
              {CONVERTER_ERROR_COPY[error.code].remedy}.
            </p>
          </div>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) onDropFile(file);
          }}
          className={cn(
            "mt-4 flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed bg-card p-8 text-center",
            dragOver ? "border-accent bg-accent-tint" : "border-line-strong",
          )}
        >
          <p className="text-base text-ink-60">
            Drag a photo here, or
          </p>
          {filePicker}
          <Button size="xl" onClick={() => inputRef.current?.click()}>
            Choose a photo
          </Button>
          <p className="text-meta text-ink-40">JPG, PNG or WEBP, up to 10 MB</p>
        </div>

        <p className="mt-4 text-sm/[1.45] text-ink-40">
          Your photo stays private. It is never published or added to the
          library, and it is deleted after you leave.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <h2 className="text-subsection text-ink">Your photo</h2>

      {photo.source === "chrome-extension" ? (
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-accent-tint-line bg-accent-tint px-3 py-1.5 text-[13.5px] font-medium text-accent-ink">
          <span aria-hidden>⌕</span> Image added from Chrome
        </p>
      ) : null}

      <div className="mt-3 rounded-card border border-line bg-card p-3 shadow-card">
        <div className="relative h-[280px] overflow-hidden rounded-thumb border border-thumb-line bg-paper">
          <Image
            src={photoUrl}
            alt="The photo you added"
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-meta text-ink-40">
            {photo.originalFilename ?? "Photo"} · {photo.width} ×{" "}
            {photo.height}
          </p>
          <Button variant="secondary" size="sm" onClick={onReplace}>
            Replace photo
          </Button>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-card p-4">
        <input
          type="checkbox"
          checked={rightsConfirmed}
          onChange={(event) => onRightsChange(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[#0E6C5F]"
        />
        <span className="text-base/[1.5] text-ink">
          I own this image or have permission to use it.
          <span className="mt-0.5 block text-sm/[1.45] text-ink-40">
            Please don’t convert copyrighted characters or artwork without
            permission.
          </span>
        </span>
      </label>

      <div className="mt-4 flex gap-3">
        {filePicker}
        <Button
          size="xl"
          className="flex-1"
          disabled={!rightsConfirmed}
          onClick={onNext}
        >
          Next: crop it
        </Button>
      </div>
      {!rightsConfirmed ? (
        <p className="mt-2 text-sm text-ink-40">
          Tick the box above to continue.
        </p>
      ) : null}
    </div>
  );
}
