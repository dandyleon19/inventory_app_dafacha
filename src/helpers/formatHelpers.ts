const EMPTY = "—"

const isMissing = (value: number | string | null | undefined): value is null | undefined | "" =>
  value === null || value === undefined || value === ""

/** Soles. Costs can carry up to 4 decimals, so `maxDecimals` lets the caller show them when present. */
export const formatMoney = (
  value: number | string | null | undefined,
  maxDecimals = 2
): string => {
  if (isMissing(value)) return EMPTY

  const amount = Number(value)
  if (!Number.isFinite(amount)) return EMPTY

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(amount)
}

export const formatPercent = (value: number | string | null | undefined): string => {
  if (isMissing(value)) return EMPTY

  const amount = Number(value)
  if (!Number.isFinite(amount)) return EMPTY

  return `${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}%`
}

/**
 * A date without time ("2026-10-02" -> "02/10/2026"). Done on the string instead of through Date, which would
 * read it as UTC midnight and show the previous day in timezones behind UTC.
 */
export const formatDateOnly = (value: string | null | undefined): string => {
  if (!value) return EMPTY

  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return EMPTY

  return `${day}/${month}/${year}`
}

/**
 * Whole days from today to a date without time (0 = today, negative = in the past). Both sides are local
 * midnights, so the answer doesn't depend on the time of day or on the timezone.
 */
export const daysFromToday = (value: string | null | undefined): number | null => {
  if (!value) return null

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null

  const target = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return EMPTY

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY

  return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(date)
}

export const formatQuantity = (value: number | string | null | undefined): string => {
  if (isMissing(value)) return EMPTY

  const amount = Number(value)
  if (!Number.isFinite(amount)) return EMPTY

  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount)
}

/** Today's local date as yyyy-mm-dd (toISOString would give the UTC day, which can already be tomorrow in the evening). */
export const todayIso = (): string => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
