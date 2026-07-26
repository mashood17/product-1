import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, resolving conflicting utility classes sanely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format an ISO date/datetime string for compact table display. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Format an ISO datetime string with time, for logs/enquiries/audit-ish views. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a number as INR currency for menu/specials pricing. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    value,
  );
}

/** Slugify a name into the `^[a-z0-9-]+$` shape the category slug field requires. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Known acronyms/brand names that should keep their own casing rather than being title-cased word by word. */
const HUMANIZE_WORD_OVERRIDES: Record<string, string> = {
  url: "URL",
  urls: "URLs",
  id: "ID",
  ids: "IDs",
  api: "API",
  seo: "SEO",
  html: "HTML",
  cta: "CTA",
  sms: "SMS",
  faq: "FAQ",
  whatsapp: "WhatsApp",
};

/** Turn a database-style key (snake_case, etc.) into a professional, human-readable label. */
export function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (HUMANIZE_WORD_OVERRIDES[lower]) return HUMANIZE_WORD_OVERRIDES[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
