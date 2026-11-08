export type LastSessionTone = "success" | "warning" | "error" | "default"

export interface LastSessionInfo {
  /** "Hoy", "Ayer", "Hace 5 días", "Nunca"... */
  label: string
  tone: LastSessionTone
  /** Whole calendar days since the session (0 = today); null when there was none. */
  daysAgo: number | null
}

const RECENT_DAYS = 7
const STALE_DAYS = 30

/** Calendar day of an ISO date-time ("2026-11-08T10:30:00") as a local midnight, ignoring the time of day. */
const dayOf = (value: string): Date | null => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

/**
 * How long ago a salon / company / user last had a session, in words and with a colour: green within a week, amber
 * up to 30 days, red beyond that, grey when there never was one. Counted in calendar days, so 11 p.m. yesterday is
 * "Ayer" and not "Hoy".
 */
export const describeLastSession = (value?: string | null, now: Date = new Date()): LastSessionInfo => {
  const day = value ? dayOf(value) : null
  if (!day) return { label: "Nunca", tone: "default", daysAgo: null }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // A server clock slightly ahead of the browser must not say "in the future".
  const daysAgo = Math.max(0, Math.round((today.getTime() - day.getTime()) / 86_400_000))

  let label: string
  if (daysAgo === 0) label = "Hoy"
  else if (daysAgo === 1) label = "Ayer"
  else if (daysAgo < 60) label = `Hace ${daysAgo} días`
  else label = `Hace ${Math.floor(daysAgo / 30)} meses`

  const tone: LastSessionTone = daysAgo < RECENT_DAYS ? "success" : daysAgo <= STALE_DAYS ? "warning" : "error"
  return { label, tone, daysAgo }
}
