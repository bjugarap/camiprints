"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import type {
  ConversionEngine,
  ConversionJob,
  ConversionSettings,
  CropState,
  ResolvedPhotoInput,
} from "@/types/converter";

import { extensionHandoffAdapter } from "../intake/extension-adapter";
import {
  dragAndDropAdapter,
  fileUploadAdapter,
} from "../intake/file-upload-adapter";
import { toIntakeError } from "../intake/photo-input";
import {
  converterReducer,
  INITIAL_CONVERTER_STATE,
  type ConverterState,
} from "../machine/converter-machine";
import {
  getConversionProvider,
  getEngineConfig,
} from "../providers/provider";
import {
  clearConverterSession,
  loadConverterState,
  loadSessionBlob,
  PHOTO_BLOB_KEY,
  RESULT_BLOB_KEY,
  saveConverterState,
  saveSessionBlob,
} from "../session/converter-session";
import { downloadBlob, pngToLetterPdf } from "../export/exports";
import { StepAdjust } from "./step-adjust";
import { StepCrop } from "./step-crop";
import { StepPhoto } from "./step-photo";
import { StepPrint } from "./step-print";
import {
  StepFailed,
  StepPreviewResult,
  StepWorking,
} from "./step-process";
import { StepStyle } from "./step-style";
import { Stepper } from "./stepper";

/**
 * The six-step wizard orchestrator. All flow logic lives in the pure
 * machine (converter-machine.ts); all conversion logic lives behind the
 * provider interface; this component wires events between them, keeps the
 * two blobs (photo, result) in refs + object URLs, and persists the
 * session so a refresh never loses work.
 */
function useObjectUrl(): [
  string | null,
  (blob: Blob | null) => void,
] {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const set = useCallback((blob: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = blob ? URL.createObjectURL(blob) : null;
    setUrl(urlRef.current);
  }, []);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  return [url, set];
}

function makePendingJob(
  engine: ConversionEngine,
  settings: ConversionSettings,
  crop: CropState,
): ConversionJob {
  return {
    id: `pending-${Date.now()}`,
    provider: engine === "local" ? "local" : "flux",
    status: "queued",
    createdAt: new Date().toISOString(),
    completedAt: null,
    processingDurationMs: null,
    settings,
    crop,
    output: null,
    error: null,
  };
}

const TERMINAL: ReadonlyArray<ConversionJob["status"]> = [
  "completed",
  "failed",
  "cancelled",
];

export function ConverterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(converterReducer, undefined, () => ({
    ...INITIAL_CONVERTER_STATE,
    engine: getEngineConfig().defaultEngine,
  }));
  const stateRef = useRef<ConverterState>(state);
  stateRef.current = state;

  const photoBlobRef = useRef<Blob | null>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [photoUrl, setPhotoBlobUrl] = useObjectUrl();
  const [resultUrl, setResultBlobUrl] = useObjectUrl();
  const [intakeError, setIntakeError] = useState(
    INITIAL_CONVERTER_STATE.error,
  );
  const [booted, setBooted] = useState(false);
  const attemptRef = useRef(0);
  const engineConfig = getEngineConfig();

  const acceptPhoto = useCallback(
    (input: ResolvedPhotoInput) => {
      photoBlobRef.current = input.blob;
      setPhotoBlobUrl(input.blob);
      resultBlobRef.current = null;
      setResultBlobUrl(null);
      setIntakeError(null);
      attemptRef.current = 0;
      dispatch({
        type: "PHOTO_RESOLVED",
        photo: {
          id: input.id,
          source: input.source,
          mimeType: input.mimeType,
          width: input.width,
          height: input.height,
          originalFilename: input.originalFilename,
          createdAt: input.createdAt,
        },
      });
      void saveSessionBlob(PHOTO_BLOB_KEY, input.blob);
    },
    [setPhotoBlobUrl, setResultBlobUrl],
  );

  const intake = useCallback(
    async (resolve: () => Promise<ResolvedPhotoInput>) => {
      try {
        acceptPhoto(await resolve());
      } catch (error) {
        setIntakeError(toIntakeError(error).info);
      }
    },
    [acceptPhoto],
  );

  /* Boot: redeem a handoff token if present, else restore the session. */
  useEffect(() => {
    let live = true;
    const token = searchParams.get("handoff");
    (async () => {
      if (token) {
        // Strip the token from the visible URL and history immediately.
        router.replace("/create/photo");
        try {
          const input = await extensionHandoffAdapter.resolve({ token });
          if (live) acceptPhoto(input);
        } catch (error) {
          if (live) setIntakeError(toIntakeError(error).info);
        }
      } else {
        const saved = loadConverterState();
        if (saved && saved.photo) {
          const [photoBlob, resultBlob] = await Promise.all([
            loadSessionBlob(PHOTO_BLOB_KEY),
            loadSessionBlob(RESULT_BLOB_KEY),
          ]);
          if (live && photoBlob) {
            photoBlobRef.current = photoBlob;
            setPhotoBlobUrl(photoBlob);
            if (resultBlob && saved.job?.status === "completed") {
              resultBlobRef.current = resultBlob;
              setResultBlobUrl(resultBlob);
            }
            dispatch({ type: "SESSION_RESTORED", state: saved });
          }
        }
      }
      if (live) setBooted(true);
    })();
    return () => {
      live = false;
    };
    // Boot exactly once; the token is read from the initial URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Persist every state change after boot. */
  useEffect(() => {
    if (booted) saveConverterState(state);
  }, [state, booted]);

  /* The conversion itself — engine/provider-agnostic, poll-ready,
     cancellable. */
  const startConversion = useCallback(
    async (settingsOverride?: ConversionSettings, engineOverride?: ConversionEngine) => {
      const photo = photoBlobRef.current;
      const current = stateRef.current;
      if (!photo || !current.photo || !current.rightsConfirmed) return;
      const settings = settingsOverride ?? current.settings;
      const engine = engineOverride ?? current.engine;
      const crop = current.crop;
      attemptRef.current += 1;

      dispatch({
        type: "CONVERT_REQUESTED",
        job: makePendingJob(engine, settings, crop),
      });
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const provider = await getConversionProvider(engine);
        let job = await provider.convert(
          { photo, crop, settings, attempt: attemptRef.current },
          {
            signal: controller.signal,
            onProgress: (progress) =>
              dispatch({ type: "JOB_PROGRESS", progress }),
          },
        );

        // Async providers return a queued/processing job; poll it home.
        while (!TERMINAL.includes(job.status)) {
          await new Promise((resolve) =>
            setTimeout(resolve, provider.pollIntervalMs ?? 1500),
          );
          if (controller.signal.aborted) {
            await provider.cancel(job.id);
            dispatch({ type: "JOB_CANCELLED" });
            return;
          }
          job = (await provider.getJob(job.id)) ?? {
            ...job,
            status: "failed",
            error: { code: "network", message: "The connection dropped" },
          };
        }

        if (job.status === "cancelled") {
          dispatch({ type: "JOB_CANCELLED" });
          return;
        }
        if (job.status === "failed") {
          dispatch({
            type: "JOB_FAILED",
            job,
            error: job.error ?? {
              code: "processing-failed",
              message: "Something went wrong while tracing",
            },
          });
          return;
        }

        const output = await provider.fetchOutput(job.id);
        if (!output) {
          dispatch({
            type: "JOB_FAILED",
            job,
            error: {
              code: "processing-failed",
              message: "Something went wrong while tracing",
            },
          });
          return;
        }
        resultBlobRef.current = output;
        setResultBlobUrl(output);
        void saveSessionBlob(RESULT_BLOB_KEY, output);
        dispatch({ type: "JOB_COMPLETED", job });
      } catch {
        dispatch({
          type: "JOB_FAILED",
          job: null,
          error: {
            code: "processing-failed",
            message: "Something went wrong while tracing",
          },
        });
      }
    },
    [setResultBlobUrl],
  );

  /** Failure remedy: run the on-device Quick Outline with settings intact. */
  const switchToQuickOutline = useCallback(() => {
    dispatch({ type: "ENGINE_SELECTED", engine: "local" });
    void startConversion(undefined, "local");
  }, [startConversion]);

  const startOver = useCallback(() => {
    abortRef.current?.abort();
    photoBlobRef.current = null;
    resultBlobRef.current = null;
    setPhotoBlobUrl(null);
    setResultBlobUrl(null);
    setIntakeError(null);
    attemptRef.current = 0;
    void clearConverterSession();
    dispatch({ type: "START_OVER" });
  }, [setPhotoBlobUrl, setResultBlobUrl]);

  const landscape = state.crop.orientation === "landscape";

  return (
    <>
      <div
        data-no-print
        className="mx-auto max-w-[1280px] px-4 pb-[34px] pt-6 md:px-10"
      >
        <div className="overflow-hidden rounded-card border border-line bg-paper">
          <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-card px-4 py-3.5 md:px-[26px]">
            <h1 className="font-display text-[19px]/none font-bold text-ink">
              Turn a photo into a coloring page
            </h1>
            <div className="ml-auto">
              <Stepper
                current={state.step}
                disabled={state.status === "processing"}
                onStepClick={(step) => dispatch({ type: "GO_TO_STEP", step })}
              />
            </div>
          </header>

          <div className="p-4 md:p-[26px]">
            {state.step === 1 ? (
              <StepPhoto
                photo={state.photo}
                photoUrl={photoUrl}
                rightsConfirmed={state.rightsConfirmed}
                error={intakeError}
                onPickFile={(file) =>
                  intake(() => fileUploadAdapter.resolve({ file }))
                }
                onDropFile={(file) =>
                  intake(() => dragAndDropAdapter.resolve({ file }))
                }
                onReplace={() => {
                  photoBlobRef.current = null;
                  setPhotoBlobUrl(null);
                  dispatch({ type: "PHOTO_REPLACED" });
                }}
                onRightsChange={(confirmed) =>
                  dispatch({ type: "RIGHTS_CHANGED", confirmed })
                }
                onNext={() => dispatch({ type: "NEXT" })}
              />
            ) : null}

            {state.step === 2 && state.photo && photoUrl ? (
              <StepCrop
                photo={state.photo}
                photoUrl={photoUrl}
                crop={state.crop}
                onCropChange={(crop) => dispatch({ type: "CROP_CHANGED", crop })}
                onBack={() => dispatch({ type: "BACK" })}
                onNext={() => dispatch({ type: "NEXT" })}
              />
            ) : null}

            {state.step === 3 ? (
              <StepStyle
                style={state.settings.style}
                engine={state.engine}
                canSwitchEngine={
                  state.engine === "ai"
                    ? engineConfig.localEnabled
                    : engineConfig.aiEnabled
                }
                onStyleSelect={(style) =>
                  dispatch({ type: "STYLE_SELECTED", style })
                }
                onEngineChange={(engine) =>
                  dispatch({ type: "ENGINE_SELECTED", engine })
                }
                onBack={() => dispatch({ type: "BACK" })}
                onConvert={() => void startConversion()}
              />
            ) : null}

            {state.step === 4 && state.status === "completed" ? (
              <StepAdjust
                engine={state.engine}
                resultUrl={resultUrl}
                settings={state.settings}
                dirty={
                  JSON.stringify(state.settings) !==
                  JSON.stringify(state.job?.settings)
                }
                onSettingsChange={(settings) =>
                  dispatch({ type: "SETTINGS_CHANGED", settings })
                }
                onRedraw={() => void startConversion()}
                onContinue={() => dispatch({ type: "CONTINUE_TO_PREVIEW" })}
                onBack={() => dispatch({ type: "BACK" })}
              />
            ) : null}

            {state.step === 4 && state.status === "processing" ? (
              <StepWorking
                progress={state.progress}
                onCancel={() => abortRef.current?.abort()}
              />
            ) : null}

            {state.step === 4 && state.status === "error" && state.error ? (
              <StepFailed
                error={state.error}
                quickOutlineAvailable={
                  state.engine === "ai" && engineConfig.localEnabled
                }
                onQuickOutline={switchToQuickOutline}
                onRetryPrimary={() => {
                  const { error, settings } = stateRef.current;
                  if (error?.code === "ai-daily-limit") {
                    switchToQuickOutline();
                    return;
                  }
                  if (error?.code === "ai-moderated") {
                    photoBlobRef.current = null;
                    setPhotoBlobUrl(null);
                    dispatch({ type: "PHOTO_REPLACED" });
                    return;
                  }
                  if (
                    error?.code === "photo-too-dark" ||
                    error?.code === "not-enough-detail"
                  ) {
                    const bumped: ConversionSettings = {
                      ...settings,
                      advanced: { ...settings.advanced, contrast: "stronger" },
                    };
                    dispatch({ type: "RETRY_WITH_MORE_CONTRAST" });
                    void startConversion(bumped);
                    return;
                  }
                  void startConversion();
                }}
                onPickDifferentPhoto={() => {
                  photoBlobRef.current = null;
                  setPhotoBlobUrl(null);
                  dispatch({ type: "PHOTO_REPLACED" });
                }}
                onBackToAdjustments={() =>
                  dispatch({ type: "BACK_TO_SETTINGS" })
                }
              />
            ) : null}

            {state.step === 5 ? (
              <StepPreviewResult
                resultUrl={resultUrl}
                landscape={landscape}
                onContinue={() => dispatch({ type: "CONTINUE_TO_PRINT" })}
                onBackToAdjustments={() => dispatch({ type: "BACK" })}
              />
            ) : null}

            {state.step === 6 ? (
              <StepPrint
                resultUrl={resultUrl}
                landscape={landscape}
                onPrint={() => window.print()}
                onDownloadPng={() => {
                  const result = resultBlobRef.current;
                  if (!result) throw new Error("no result");
                  downloadBlob(result, "coloring-page.png");
                }}
                onDownloadPdf={async () => {
                  const result = resultBlobRef.current;
                  if (!result) throw new Error("no result");
                  downloadBlob(await pngToLetterPdf(result), "coloring-page.pdf");
                }}
                onMakeAnother={startOver}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* The printable sheet — the only thing @media print leaves visible. */}
      {resultUrl ? (
        <div data-print-sheet className="hidden print:flex">
          <Image
            src={resultUrl}
            alt=""
            width={850}
            height={1100}
            unoptimized
          />
        </div>
      ) : null}
    </>
  );
}
