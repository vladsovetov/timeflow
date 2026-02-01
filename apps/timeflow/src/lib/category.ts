const SYSTEM_CATEGORY_KEYS: Record<string, string> = {
  Useful: "categoryUseful",
  Important: "categoryImportant",
  Procrastination: "categoryProcrastination",
};

export function getCategoryDisplayName(
  category: { name: string; user_id: string | null } | null,
  t: (key: string) => string,
  fallback: string
): string {
  if (category == null) return fallback;
  if (category.user_id === null) {
    const key = SYSTEM_CATEGORY_KEYS[category.name];
    if (key) return t(key);
  }
  return category.name;
}
