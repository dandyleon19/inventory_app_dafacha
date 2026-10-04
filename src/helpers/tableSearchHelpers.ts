const MAX_TABLE_SEARCH_LENGTH = 255

export function normalizeTableSearch(value?: string | null): string {
  if (!value) return ""

  return value.trim().slice(0, MAX_TABLE_SEARCH_LENGTH)
}

export function areTableSearchEqual(
  current?: string | null,
  next?: string | null
): boolean {
  return normalizeTableSearch(current) === normalizeTableSearch(next)
}
