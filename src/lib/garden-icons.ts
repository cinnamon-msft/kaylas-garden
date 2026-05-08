export const DEFAULT_GARDEN_ICON = "🌱";

export const GARDEN_ICON_OPTIONS = [
  { icon: "🌱", label: "Seedling" },
  { icon: "🌿", label: "Herb sprig" },
  { icon: "🪴", label: "Potted plant" },
  { icon: "🌻", label: "Sunflower" },
  { icon: "🌷", label: "Tulip" },
  { icon: "🌸", label: "Blossom" },
  { icon: "🍓", label: "Strawberry" },
  { icon: "🐝", label: "Bee" },
  { icon: "🦋", label: "Butterfly" },
  { icon: "🍄", label: "Mushroom" },
] as const;

export function normalizeGardenIcon(icon: string | null | undefined): string {
  return icon && GARDEN_ICON_OPTIONS.some((option) => option.icon === icon)
    ? icon
    : DEFAULT_GARDEN_ICON;
}

export function getGardenIconFaviconHref(icon: string): string {
  const normalizedIcon = normalizeGardenIcon(icon);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${normalizedIcon}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
