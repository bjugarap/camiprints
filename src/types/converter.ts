/**
 * Photo-converter domain types. Like the catalog types, option values are
 * stable slugs (they persist in sessions and job records) with display
 * labels beside them. Sliders speak in words, never numbers — a deliberate
 * design decision from the handoff.
 */

/* ---------------------------------------------------------------- styles */
export const CONVERTER_STYLES = ["bold", "classic", "detailed"] as const;
export type ConverterStyle = (typeof CONVERTER_STYLES)[number];
export const CONVERTER_STYLE_LABELS: Record<
  ConverterStyle,
  { name: string; hint: string }
> = {
  bold: { name: "Bold & simple", hint: "Thick lines, big spaces — good for young children" },
  classic: { name: "Classic outline", hint: "Balanced lines, like a storybook page" },
  detailed: { name: "Fine detail", hint: "More lines to color, for patient hands" },
};

/* --------------------------------------------------------------- sliders */
export const DETAIL_WORDS = ["simpler", "just-right", "more-lines"] as const;
export type DetailWord = (typeof DETAIL_WORDS)[number];
export const DETAIL_WORD_LABELS: Record<DetailWord, string> = {
  simpler: "Simpler",
  "just-right": "Just right",
  "more-lines": "More lines",
};

export const LINE_WEIGHTS = ["fine", "regular", "thick"] as const;
export type LineWeight = (typeof LINE_WEIGHTS)[number];
export const LINE_WEIGHT_LABELS: Record<LineWeight, string> = {
  fine: "Fine",
  regular: "Regular",
  thick: "Thick",
};

export const CONTRAST_LEVELS = ["softer", "normal", "stronger"] as const;
export type ContrastLevel = (typeof CONTRAST_LEVELS)[number];
export const CONTRAST_LEVEL_LABELS: Record<ContrastLevel, string> = {
  softer: "Softer",
  normal: "Normal",
  stronger: "Stronger",
};

export interface AdvancedSettings {
  lineWeight: LineWeight;
  contrast: ContrastLevel;
  removeBackground: boolean;
  invert: boolean;
}

export interface ConversionSettings {
  style: ConverterStyle;
  detail: DetailWord;
  advanced: AdvancedSettings;
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  style: "classic",
  detail: "just-right",
  advanced: {
    lineWeight: "regular",
    contrast: "normal",
    removeBackground: false,
    invert: false,
  },
};

/* ------------------------------------------------------------------ crop */
export interface CropState {
  orientation: "portrait" | "landscape";
  /** Quarter-turn rotation applied before the crop window. */
  rotation: 0 | 90 | 180 | 270;
  /** 1 = fit the frame; larger values zoom into the photo. */
  zoom: number;
  /** Pan of the photo behind the frame, normalized -1..1 per axis. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_CROP: CropState = {
  orientation: "portrait",
  rotation: 0,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

/* --------------------------------------------------------------- sources */
export type PhotoInputSource =
  | "file-upload"
  | "drag-and-drop"
  | "chrome-extension"
  | "saved-creation"
  | "mobile-share-target";

/** What the wizard consumes — every intake adapter normalizes to this. */
export interface ResolvedPhotoInput {
  id: string;
  source: PhotoInputSource;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  originalFilename?: string;
  createdAt: string;
}

/** The serializable part of a resolved input (the blob lives in IndexedDB). */
export type ResolvedPhotoMeta = Omit<ResolvedPhotoInput, "blob">;

/* ---------------------------------------------------------------- engine */
/**
 * Which conversion engine the user is working with. "ai" is the primary
 * production path (server-mediated vendor per AI_PROVIDER); "local" is the
 * on-device Quick Outline mode — fast, private, lower quality.
 */
export const CONVERSION_ENGINES = ["ai", "local"] as const;
export type ConversionEngine = (typeof CONVERSION_ENGINES)[number];

/* ------------------------------------------------------------------ jobs */
export const CONVERSION_PROVIDER_IDS = [
  "local",
  "openai",
  "flux",
  "imagen",
] as const;
export type ConversionProviderId = (typeof CONVERSION_PROVIDER_IDS)[number];

export type ConversionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface ConversionOutputMeta {
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}

export interface ConversionErrorInfo {
  code: ConverterErrorCode;
  /** Calm, user-facing sentence — never a stack trace. */
  message: string;
}

/**
 * The reusable Conversion Job record. LocalProvider completes it in one
 * call; async providers (OpenAI, Flux, Imagen) move it through queued →
 * processing over multiple polls. The shape is identical either way, so
 * swapping providers never touches the UI.
 */
export interface ConversionJob {
  id: string;
  provider: ConversionProviderId;
  status: ConversionJobStatus;
  createdAt: string;
  completedAt: string | null;
  processingDurationMs: number | null;
  settings: ConversionSettings;
  crop: CropState;
  /** Metadata only — the output image itself travels as a Blob. */
  output: ConversionOutputMeta | null;
  error: ConversionErrorInfo | null;
}

export interface ConversionProgress {
  /** Stable stage id for tests and logging. */
  stage: string;
  /** Calm human message, e.g. "Finding the main outlines…". */
  message: string;
  /** Real progress: stages completed out of total. Never invented. */
  completedStages: number;
  totalStages: number;
}

/* ---------------------------------------------------------------- errors */
export const CONVERTER_ERROR_CODES = [
  "unsupported-type",
  "file-too-large",
  "image-too-small",
  "image-too-large",
  "corrupt-image",
  "photo-too-dark",
  "not-enough-detail",
  "processing-failed",
  "cancelled",
  "network",
  "provider-not-configured",
  "handoff-invalid",
  "handoff-expired",
  "rate-limited",
  "ai-timeout",
  "ai-moderated",
  "ai-bad-output",
  "ai-daily-limit",
] as const;
export type ConverterErrorCode = (typeof CONVERTER_ERROR_CODES)[number];

/**
 * Calm error copy (hi-fi 5d failure shell): heading names the actual
 * problem; the first remedy fixes the likely cause. Settings always stay.
 */
export const CONVERTER_ERROR_COPY: Record<
  ConverterErrorCode,
  { heading: string; remedy: string }
> = {
  "unsupported-type": {
    heading: "That file type won’t work here",
    remedy: "Pick a JPG, PNG or WEBP photo",
  },
  "file-too-large": {
    heading: "That photo is too big to use",
    remedy: "Pick a photo under 10 MB",
  },
  "image-too-small": {
    heading: "That photo is too small to trace",
    remedy: "Pick a larger photo",
  },
  "image-too-large": {
    heading: "That photo has too many pixels",
    remedy: "Pick a smaller photo",
  },
  "corrupt-image": {
    heading: "That photo couldn’t be opened",
    remedy: "Pick a different photo",
  },
  "photo-too-dark": {
    heading: "That photo came out too dark to trace",
    remedy: "Try again with more contrast",
  },
  "not-enough-detail": {
    heading: "We couldn’t find outlines in that photo",
    remedy: "Try again with more contrast",
  },
  "processing-failed": {
    heading: "Something went wrong while tracing",
    remedy: "Try again",
  },
  cancelled: {
    heading: "Stopped — nothing was lost",
    remedy: "Make my page",
  },
  network: {
    heading: "The connection dropped",
    remedy: "Try again",
  },
  "provider-not-configured": {
    heading: "Converting isn’t available right now",
    remedy: "Try again later",
  },
  "handoff-invalid": {
    heading: "This image link has expired",
    remedy: "Return to the extension and choose Make Coloring Page again",
  },
  "handoff-expired": {
    heading: "This image link has expired",
    remedy: "Return to the extension and choose Make Coloring Page again",
  },
  "rate-limited": {
    heading: "Too many tries at once",
    remedy: "Wait a moment, then try again",
  },
  "ai-timeout": {
    heading: "The AI took too long to draw",
    remedy: "Try again",
  },
  "ai-moderated": {
    heading: "That photo can’t be turned into a page",
    remedy: "Pick a different photo",
  },
  "ai-bad-output": {
    heading: "The page didn’t come out right",
    remedy: "Try again",
  },
  "ai-daily-limit": {
    heading: "Today’s AI page is used up",
    remedy: "Try Quick Outline instead",
  },
};
