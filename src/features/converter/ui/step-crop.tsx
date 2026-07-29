"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import type { CropState, ResolvedPhotoMeta } from "@/types/converter";

/**
 * Step 2 · Crop. A fixed letter-aspect frame with the photo behind it:
 * drag (or arrow keys) to move, a slider to zoom, one button to rotate,
 * two pills for orientation. The transform math mirrors rasterizeCrop()
 * exactly, so what the frame shows is what the pipeline traces.
 */
const LETTER_ASPECT = 8.5 / 11;

export function StepCrop({
  photo,
  photoUrl,
  crop,
  onCropChange,
  onBack,
  onNext,
}: {
  photo: ResolvedPhotoMeta;
  photoUrl: string;
  crop: CropState;
  onCropChange: (crop: Partial<CropState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () =>
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [crop.orientation]);

  const rotated = crop.rotation % 180 !== 0;
  const photoW = rotated ? photo.height : photo.width;
  const photoH = rotated ? photo.width : photo.height;
  const cover =
    frameSize.width > 0
      ? Math.max(frameSize.width / photoW, frameSize.height / photoH)
      : 0;
  const scale = cover * Math.max(1, crop.zoom);
  const overX = Math.max(0, (photoW * scale - frameSize.width) / 2);
  const overY = Math.max(0, (photoH * scale - frameSize.height) / 2);

  const clamp = (value: number) => Math.min(1, Math.max(-1, value));

  const nudge = useCallback(
    (dx: number, dy: number) => {
      onCropChange({
        offsetX: clamp(crop.offsetX + dx),
        offsetY: clamp(crop.offsetY + dy),
      });
    },
    [crop.offsetX, crop.offsetY, onCropChange],
  );

  return (
    <div className="mx-auto max-w-[640px]">
      <h2 className="text-subsection text-ink">Frame the picture</h2>
      <p className="mt-1.5 text-base/[1.5] text-ink-60">
        Move the photo until the part you want fills the page.
      </p>

      {/* Orientation + rotate. */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div
          role="radiogroup"
          aria-label="Page orientation"
          className="flex gap-2"
        >
          {(["portrait", "landscape"] as const).map((orientation) => {
            const selected = crop.orientation === orientation;
            return (
              <button
                key={orientation}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onCropChange({ orientation })}
                className={cn(
                  "h-12 cursor-pointer rounded-full border-[1.5px] px-5 text-[15px] font-semibold",
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-card text-ink hover:bg-paper",
                )}
              >
                {orientation === "portrait" ? "Tall page" : "Wide page"}
              </button>
            );
          })}
        </div>
        <Button
          variant="secondary"
          size="md"
          className="ml-auto border-line"
          onClick={() =>
            onCropChange({
              rotation: ((crop.rotation + 90) % 360) as CropState["rotation"],
            })
          }
        >
          Rotate ↻
        </Button>
      </div>

      {/* The frame. */}
      <div
        ref={frameRef}
        role="group"
        aria-label="Crop frame. The photo sits behind a page-shaped window; use the arrow keys to move it."
        tabIndex={0}
        onKeyDown={(event) => {
          const step = 0.06;
          if (event.key === "ArrowLeft") nudge(-step, 0);
          else if (event.key === "ArrowRight") nudge(step, 0);
          else if (event.key === "ArrowUp") nudge(0, -step);
          else if (event.key === "ArrowDown") nudge(0, step);
          else return;
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: crop.offsetX,
            offsetY: crop.offsetY,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          // Dragging the photo right moves the visible window left.
          const dx = overX > 0 ? (drag.startX - event.clientX) / overX : 0;
          const dy = overY > 0 ? (drag.startY - event.clientY) / overY : 0;
          onCropChange({
            offsetX: clamp(drag.offsetX + dx),
            offsetY: clamp(drag.offsetY + dy),
          });
        }}
        onPointerUp={() => (dragRef.current = null)}
        onPointerCancel={() => (dragRef.current = null)}
        className={cn(
          "relative mx-auto mt-4 touch-none overflow-hidden rounded-[6px] border-[1.5px] border-dashed border-trim bg-card",
          crop.orientation === "portrait"
            ? "w-full max-w-[360px]"
            : "w-full max-w-[560px]",
          dragRef.current ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          aspectRatio:
            crop.orientation === "portrait"
              ? `${LETTER_ASPECT}`
              : `${1 / LETTER_ASPECT}`,
        }}
      >
        {frameSize.width > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob URL under a live CSS transform; next/image adds nothing here.
          <img
            src={photoUrl}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: photo.width * scale,
              height: photo.height * scale,
              transform: `translate(-50%, -50%) translate(${
                -crop.offsetX * overX
              }px, ${-crop.offsetY * overY}px) rotate(${crop.rotation}deg)`,
            }}
          />
        ) : null}
      </div>

      {/* Zoom. */}
      <div className="mx-auto mt-4 max-w-[360px]">
        <label
          htmlFor="crop-zoom"
          className="text-[15px] font-semibold text-ink"
        >
          Zoom
        </label>
        <input
          id="crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={crop.zoom}
          aria-valuetext={`${Math.round(crop.zoom * 100)}%`}
          onChange={(event) =>
            onCropChange({ zoom: Number(event.target.value) })
          }
          className="converter-range mt-2"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0% ${
              ((crop.zoom - 1) / 2) * 100
            }%, var(--color-line) ${((crop.zoom - 1) / 2) * 100}% 100%)`,
          }}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <Button variant="secondary" size="xl" onClick={onBack}>
          Back
        </Button>
        <Button size="xl" className="flex-1" onClick={onNext}>
          Next: pick a style
        </Button>
      </div>
    </div>
  );
}
