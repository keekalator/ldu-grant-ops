/**
 * Global entity color system — applies consistently across ALL pages.
 * Every grant card, filter tag, and pipeline row shows its entity via these colors.
 */

export interface EntityStyle {
  color: string;     // solid accent / border color
  bg: string;        // light background
  shadow: string;    // pixel shadow color
  dot: string;       // small indicator dot
  label: string;     // short display name
}

export const ENTITY_STYLES: Record<string, EntityStyle> = {
  // LDU 501(c)(3) variants
  "LDU (501c3)":         { color: "#1565e8", bg: "#dbeafe", shadow: "#0044aa", dot: "#1565e8", label: "LDU" },
  "LDU":                 { color: "#1565e8", bg: "#dbeafe", shadow: "#0044aa", dot: "#1565e8", label: "LDU" },
  "Life Development Group": { color: "#1565e8", bg: "#dbeafe", shadow: "#0044aa", dot: "#1565e8", label: "LDG" },

  // Studio WELEH — pink
  "Studio WELEH":        { color: "#ff1e78", bg: "#ffe0f0", shadow: "#cc0055", dot: "#ff1e78", label: "WELEH" },

  // Gorilla Rx — green
  "Gorilla Rx":          { color: "#00a83a", bg: "#d1fae5", shadow: "#007a2a", dot: "#00a83a", label: "GRX" },
  "Gorilla Rx Wellness": { color: "#00a83a", bg: "#d1fae5", shadow: "#007a2a", dot: "#00a83a", label: "GRX" },

  // Farm / Cultivation Campus — orange
  "Farm Entity":         { color: "#ff6b00", bg: "#fde68a", shadow: "#cc5500", dot: "#ff6b00", label: "FARM" },

  // Kika Keith (founder grants) — purple
  "Kika Keith":          { color: "#7c3aed", bg: "#ede9fe", shadow: "#5500cc", dot: "#7c3aed", label: "KK" },

  // Fallback
  default:               { color: "#aaaacc", bg: "#f0f0f8", shadow: "#888899", dot: "#aaaacc", label: "?" },
};

export function getEntityStyle(entity: string | undefined): EntityStyle {
  if (!entity) return ENTITY_STYLES.default;
  // Try exact match first
  if (ENTITY_STYLES[entity]) return ENTITY_STYLES[entity];
  // Fuzzy match
  if (entity.toLowerCase().includes("weleh"))    return ENTITY_STYLES["Studio WELEH"];
  if (entity.toLowerCase().includes("gorilla"))  return ENTITY_STYLES["Gorilla Rx"];
  if (entity.toLowerCase().includes("farm"))     return ENTITY_STYLES["Farm Entity"];
  if (entity.toLowerCase().includes("kika"))     return ENTITY_STYLES["Kika Keith"];
  if (entity.toLowerCase().includes("ldu") ||
      entity.toLowerCase().includes("life development")) return ENTITY_STYLES["LDU"];
  return ENTITY_STYLES.default;
}

export const ALL_ENTITIES = [
  { id: "all",               label: "ALL",   style: { color: "#0a0a1a", bg: "#ffffff", dot: "#0a0a1a" } },
  { id: "LDU (501c3)",       label: "LDU",   style: ENTITY_STYLES["LDU (501c3)"] },
  { id: "Studio WELEH",      label: "WELEH", style: ENTITY_STYLES["Studio WELEH"] },
  { id: "Gorilla Rx",        label: "GRX",   style: ENTITY_STYLES["Gorilla Rx"] },
  { id: "Farm Entity",       label: "FARM",  style: ENTITY_STYLES["Farm Entity"] },
  { id: "Kika Keith",        label: "KK",    style: ENTITY_STYLES["Kika Keith"] },
];
