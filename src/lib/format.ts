import { format, parseISO } from "date-fns";

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "M/d/yy");
}

export function timelineText(
  firstSeen: string | null | undefined,
  lastSeen: string | null | undefined,
): string {
  if (!firstSeen) return "";
  if (!lastSeen || firstSeen === lastSeen) return `Only ${shortDate(firstSeen)}`;
  return `${shortDate(firstSeen)} → ${shortDate(lastSeen)}`;
}
