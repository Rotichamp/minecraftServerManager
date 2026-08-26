import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "../lib/utils";

/* ── Spinner ─────────────────────────────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

/* ── Button with loading state ───────────────────────────── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}
export function Button({ loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn("btn-secondary", className)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────────── */
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}

/* ── Modal ───────────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full animate-scale-in flex-col overflow-hidden rounded-xl border border-white/10 bg-surface shadow-card",
          wide ? "max-w-3xl" : "max-w-md",
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h3 className="font-display text-sm font-semibold">{title}</h3>
            <button onClick={onClose} aria-label="Close dialog" className="btn-icon">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto scroll-thin p-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Confirm dialog ──────────────────────────────────────── */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={danger ? "btn-danger" : "btn-primary"}
        >
          {loading && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ── Section header ──────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
