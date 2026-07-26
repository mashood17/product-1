import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/** Shared field chrome: label, hint, error message, consistent spacing. */
export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-700">
          {label}
          {required && <span className="ml-0.5 text-accent-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const baseControlClasses =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-elevation-sm transition-all focus:border-accent-500 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-accent-500/25 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 disabled:shadow-none";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, required, onWheel, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={inputId}
        className={cn(baseControlClasses, error && "border-red-400 focus:border-red-500", className)}
        aria-invalid={!!error || undefined}
        required={required}
        onWheel={
          props.type === "number"
            ? (e) => {
                e.currentTarget.blur();
                onWheel?.(e);
              }
            : onWheel
        }
        {...props}
      />
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, required, rows = 4, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cn(baseControlClasses, "resize-y", error && "border-red-400 focus:border-red-500", className)}
        aria-invalid={!!error || undefined}
        required={required}
        {...props}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, hint, error, id, required, children, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={inputId}
        className={cn(baseControlClasses, "cursor-pointer", error && "border-red-400 focus:border-red-500", className)}
        aria-invalid={!!error || undefined}
        required={required}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-800", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        {...props}
      />
      {label}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500",
          checked ? "bg-accent-600" : "bg-neutral-300",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-elevation-sm transition-transform duration-150",
            checked ? "translate-x-[18px]" : "translate-x-1",
          )}
        />
      </button>
      {label && <span className="text-sm text-neutral-700">{label}</span>}
    </label>
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-xs font-medium text-neutral-700" {...props} />;
}
