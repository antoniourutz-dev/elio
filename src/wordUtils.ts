export const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  return '';
};

export const uniqueNonEmptyStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const parseSynonyms = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const rawValue = value.trim();
  if (!rawValue) return [];

  if (rawValue.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toStringValue(item)).filter(Boolean);
      }
    } catch {
      // Fall through to separator splitting.
    }
  }

  return rawValue
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getFirstValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
  return null;
};
