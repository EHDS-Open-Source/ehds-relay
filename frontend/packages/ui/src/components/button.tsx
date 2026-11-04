import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@ehds-relay/ui/lib/utils";
import { Slot } from "radix-ui";

import { LoadingStar } from "../feedback/LoadingStar";

// Pills in Poppins 600 with a 2px border. Types: primary, secondary, row, icon, destructive
// (destructive only inside confirmations). `default`, `outline`, `ghost` and `link` are older
// names kept as aliases for the types above.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-3 rounded-full border-2 font-semibold whitespace-nowrap transition-[color,background-color,border-color] disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none aria-busy:[&>[data-slot=icon]]:hidden [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-yellow bg-primary text-primary-foreground hover:border-blue hover:bg-blue hover:text-yellow",
        secondary:
          "border-blue-tint-80 bg-transparent text-blue hover:border-blue hover:bg-blue-tint-90",
        row: "border-blue bg-blue text-white hover:border-blue-shade hover:bg-blue-shade",
        icon: "border-yellow bg-yellow text-blue hover:border-yellow-shade hover:bg-yellow-shade",
        destructive:
          "border-destructive bg-destructive text-white hover:border-error-on-white-shade hover:bg-error-on-white-shade focus-visible:outline-error-on-white",
        link: "border-transparent text-blue underline underline-offset-4 hover:no-underline",
        // Older names.
        default:
          "border-yellow bg-primary text-primary-foreground hover:border-blue hover:bg-blue hover:text-yellow",
        outline:
          "border-blue-tint-80 bg-transparent text-blue hover:border-blue hover:bg-blue-tint-90",
        ghost:
          "border-blue-tint-80 bg-transparent text-blue hover:border-blue hover:bg-blue-tint-90",
      },
      surface: {
        white: "",
        blue: "",
      },
      size: {
        sm: "h-[34px] px-4 text-[0.88em]",
        default: "h-10 px-5 text-[0.95em]",
        record: "h-[46px] px-6 text-base",
        lg: "h-[50px] px-7 text-[1.05em]",
        xs: "h-6 gap-1 px-2 text-xs",
        // Icon-only sizes; the circle is 44px for the standard icon button.
        icon: "size-11 p-0",
        "icon-xs": "size-6 p-0",
        "icon-sm": "size-8 p-0",
        "icon-lg": "size-12 p-0",
      },
    },
    compoundVariants: [
      {
        variant: ["primary", "default"],
        surface: "blue",
        className:
          "hover:border-yellow-shade hover:bg-yellow-shade hover:text-blue",
      },
      {
        variant: ["secondary", "outline", "ghost"],
        surface: "blue",
        className:
          "border-white/45 text-white hover:border-white hover:bg-white/10",
      },
      {
        // On blue the icon button darkens like on white; a close button may opt into white.
        variant: "icon",
        surface: "blue",
        className: "hover:border-yellow-shade hover:bg-yellow-shade",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
      surface: "white",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "surface"> & {
    asChild?: boolean;
    /** The button sits on a blue surface. */
    onBlue?: boolean;
    /**
     * Work is in progress: the spinning star takes the place of the button's icon, after the
     * label. The button keeps its look and its focus but cannot be pressed, and is marked busy.
     */
    busy?: boolean;
  };

function Button({
  className,
  variant = "primary",
  size = "default",
  onBlue = false,
  busy = false,
  asChild = false,
  children,
  disabled,
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const isBusy = busy && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={isBusy || undefined}
      aria-disabled={isBusy || undefined}
      disabled={asChild ? undefined : disabled}
      className={cn(
        buttonVariants({
          variant,
          size,
          surface: onBlue ? "blue" : "white",
          className,
        }),
      )}
      {...props}
      // Not `disabled` while busy, so focus stays put; presses (and form submits) are dropped.
      onClick={
        isBusy
          ? (event: React.MouseEvent<HTMLButtonElement>) =>
              event.preventDefault()
          : onClick
      }
      onKeyDown={
        isBusy
          ? (event: React.KeyboardEvent<HTMLButtonElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
              }
            }
          : onKeyDown
      }
      onPointerDown={isBusy ? undefined : onPointerDown}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {isBusy ? (
            <LoadingStar size={size === "lg" ? "large-button" : "button"} />
          ) : null}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
