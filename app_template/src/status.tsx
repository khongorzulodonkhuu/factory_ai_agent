// Status badge provided by the factory scaffold, so every screen shows statuses the same readable way:
// a solid white pill with coloured text and a dot, legible on photos and on cards.
// Usage: <StatusBadge status={booking.status} />  (label defaults to the translated status)
import { useT } from "./i18n";

const COLORS: Record<string, string> = {
  pending: "text-warning",
  confirmed: "text-success",
  approved: "text-success",
  active: "text-primary",
  available: "text-success",
  completed: "text-text-muted",
  unavailable: "text-text-muted",
  cancelled: "text-danger",
  canceled: "text-danger",
  declined: "text-danger",
};

export function StatusBadge({ status, label, className = "" }: { status: string; label?: string; className?: string }) {
  const t = useT();
  const key = String(status ?? "").toLowerCase();
  const text = label ?? t(key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
  return (
    <span
      data-testid="status-badge"
      data-status={key}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold shadow-md ring-1 ring-black/10 ${COLORS[key] ?? "text-text"} ${className}`}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {text}
    </span>
  );
}
