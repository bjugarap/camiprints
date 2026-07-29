"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Text field (handoff §Fields): 48px tall, 10px radius, white, 1.5px
 * line-strong border. Label sits above at 14/600. Focus adds the accent
 * border (the amber ring comes from the global rule). Errors switch the
 * border and add a 13.5/500 message tied via aria-describedby.
 */
export interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  /** Visually hide the label while keeping it for screen readers. */
  hideLabel?: boolean;
  error?: string;
  containerClassName?: string;
}

export function Field({
  label,
  hideLabel = false,
  error,
  className,
  containerClassName,
  id: idProp,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col", containerClassName)}>
      <label
        htmlFor={id}
        className={cn(
          "mb-1.5 text-sm font-semibold text-ink",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 rounded-field border-[1.5px] border-line-strong bg-card px-3.5 text-base text-ink placeholder:text-ink-40 focus:border-accent focus:outline-3",
          error && "border-error",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-[13.5px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
