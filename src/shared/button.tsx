import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The CamiPrints button set (handoff §Button set). Labels are always verbs.
 * Print is the only primary that ever appears on a card. The focus ring comes
 * from the global :focus-visible rule — identical on white, paper and teal.
 *
 * Sizes are the handoff's control heights: 44 / 48 / 52 / 56 / 64.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold disabled:pointer-events-none disabled:border-0 disabled:bg-disabled disabled:text-white",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-hover",
        secondary: "border-[1.5px] border-ink bg-card text-ink hover:bg-paper",
        quiet:
          "text-accent underline underline-offset-[3px] hover:text-accent-hover",
        icon: "border-[1.5px] border-line bg-card text-ink hover:bg-paper",
      },
      size: {
        sm: "h-11 px-[18px] text-[15px]", // 44 — card Print in 5-up rows, chips
        md: "h-12 px-[22px] text-base", // 48 — the standard control
        lg: "h-13 px-[22px] text-[16.5px]", // 52 — detail downloads, remedies
        xl: "h-14 px-[26px] text-lg", // 56 — hero and promo primaries
        print: "h-16 px-7 text-xl", // 64 — the detail-page "Print this page"
      },
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "w-11 px-0" },
      { variant: "icon", size: "md", className: "w-12 px-0" },
      { variant: "icon", size: "lg", className: "w-13 px-0" },
      { variant: "icon", size: "xl", className: "w-14 px-0" },
      { variant: "quiet", size: "sm", className: "px-3" },
      { variant: "quiet", size: "md", className: "px-3" },
      { variant: "quiet", size: "lg", className: "px-3" },
      { variant: "quiet", size: "xl", className: "px-3" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Link) with button styling. */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { buttonVariants };
