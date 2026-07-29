import { cn } from "@/lib/utils";

import type { ConverterStep } from "../machine/converter-machine";

/**
 * The six-step stepper (handoff §Stepper): 26px circles — complete =
 * accent fill with ✓, current = ink fill with the numeral, upcoming =
 * bordered. Connectors are 22×1.5 line, except the one entering the
 * current step, which is accent. Completed steps are buttons (revisiting
 * is lossless); mobile collapses to a plain "Step n of 6" line.
 */
export const STEP_LABELS: Record<ConverterStep, string> = {
  1: "Photo",
  2: "Crop",
  3: "Style",
  4: "Adjust",
  5: "Preview",
  6: "Print",
};

const STEPS: ConverterStep[] = [1, 2, 3, 4, 5, 6];

export function Stepper({
  current,
  onStepClick,
  disabled = false,
}: {
  current: ConverterStep;
  /** Called for completed steps only. */
  onStepClick: (step: ConverterStep) => void;
  /** True while processing — nothing in the stepper navigates. */
  disabled?: boolean;
}) {
  return (
    <>
      <p className="text-sm font-semibold text-ink md:hidden">
        Step {current} of 6 · {STEP_LABELS[current]}
      </p>
      <ol
        aria-label="Steps"
        className="hidden items-center gap-2.5 text-sm font-semibold text-ink-40 md:flex"
      >
        {STEPS.map((step) => {
          const isComplete = step < current;
          const isCurrent = step === current;
          const circle = (
            <span
              aria-hidden
              className={cn(
                "flex size-[26px] items-center justify-center rounded-full text-[13px] font-semibold",
                isComplete && "bg-accent text-white",
                isCurrent && "bg-ink text-white",
                !isComplete && !isCurrent &&
                  "border-[1.5px] border-line-strong text-ink",
              )}
            >
              {isComplete ? "✓" : step}
            </span>
          );
          return (
            <li key={step} className="flex items-center gap-2.5">
              {step > 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-[1.5px] w-[22px]",
                    isCurrent ? "bg-accent" : "bg-line",
                  )}
                />
              ) : null}
              {isComplete && !disabled ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step)}
                  className="flex cursor-pointer items-center gap-[7px] rounded-full hover:text-accent"
                >
                  {circle}
                  <span>{STEP_LABELS[step]}</span>
                  <span className="sr-only"> — completed, go back to this step</span>
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-[7px]",
                    isCurrent && "text-ink",
                  )}
                >
                  {circle}
                  <span>{STEP_LABELS[step]}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
