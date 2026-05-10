export type DocStatus = "ok" | "expiring" | "expired" | "none";

export function getDocStatus(date: string | null | undefined, warnDays = 30): DocStatus {
  if (!date) return "none";
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "expired";
  if (diff <= warnDays) return "expiring";
  return "ok";
}

export function statusBadgeClass(s: DocStatus): string {
  switch (s) {
    case "expired":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "expiring":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "ok":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusLabel(s: DocStatus): string {
  return { ok: "Em dia", expiring: "Vence em breve", expired: "Vencido", none: "—" }[s];
}

export function formatDateBR(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
