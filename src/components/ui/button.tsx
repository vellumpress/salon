import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans text-sm font-medium tracking-wide transition-[opacity,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 active:opacity-80",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-ink-soft focus-visible:outline-ink",
        paper: "bg-paper text-ink hover:bg-paper-deep focus-visible:outline-paper",
        ink: "bg-ink text-paper hover:bg-ink-soft focus-visible:outline-ink",
        red: "bg-red text-paper hover:opacity-90 focus-visible:outline-red",
        ghost:
          "bg-transparent text-current hover:bg-ink/8 focus-visible:outline-current",
        quiet:
          "bg-transparent text-muted hover:text-ink focus-visible:outline-muted",
      },
      size: {
        default: "h-11 rounded-none px-5",
        lg: "h-12 rounded-none px-6",
        sm: "h-9 rounded-none px-3 text-xs",
        icon: "size-11 rounded-none",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
