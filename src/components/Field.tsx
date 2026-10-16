import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ControlProps = { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/** Shared input style for controls inside a `Field`. */
export const fieldInputCls =
  "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50";

/**
 * TROVE's pill-style form field: the label sits inside the box above the
 * control. The wrapping <label> names the control; an error renders under the
 * box and is linked with aria-describedby + aria-invalid.
 */
export function Field({
  label,
  children,
  error,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // Wire aria onto every direct control child (a field may hold an input plus
  // a small button, e.g. the password eye).
  const wire = (child: ReactNode): ReactNode => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<ControlProps & { children?: ReactNode }>;
    if (typeof el.type === "string" && ["input", "select", "textarea"].includes(el.type)) {
      return cloneElement(el, {
        "aria-invalid": error ? true : el.props["aria-invalid"],
        "aria-describedby": [el.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
      });
    }
    if (el.props.children) return cloneElement(el, {}, Children.map(el.props.children, wire));
    return el;
  };

  return (
    <div className={className}>
      <label
        className={cn(
          "block rounded-2xl bg-surface px-4 py-2.5 ring-1 transition focus-within:ring-primary/60",
          error ? "ring-destructive/70" : "ring-border",
        )}
      >
        <span className="block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="mt-0.5">{Children.map(children, wire)}</div>
      </label>
      {hint && !error && (
        <p id={hintId} className="mt-1 px-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 px-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
