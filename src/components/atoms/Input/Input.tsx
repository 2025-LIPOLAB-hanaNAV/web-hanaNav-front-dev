import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../ui/utils";

const inputVariants = cva(
  "flex w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-background",
        filled: "bg-muted",
        ghost: "border-transparent bg-transparent",
        glass: "glass-morphism border-glass-border",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      state: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive/20",
        success: "border-success-500 focus-visible:ring-success-500/20",
        warning: "border-warning-500 focus-visible:ring-warning-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  "aria-describedby"?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    state,
    type = "text",
    leftIcon,
    rightIcon,
    label,
    helperText,
    errorMessage,
    id,
    "aria-describedby": ariaDescribedBy,
    ...props 
  }, ref) => {
    const inputId = id || React.useId();
    const helperTextId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const finalState = errorMessage ? "error" : state;
    
    const describedBy = [
      ariaDescribedBy,
      helperText && helperTextId,
      errorMessage && errorId,
    ].filter(Boolean).join(" ");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size, state: finalState }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            id={inputId}
            aria-describedby={describedBy || undefined}
            aria-invalid={finalState === "error"}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p id={helperTextId} className="mt-1 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
        {errorMessage && (
          <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };