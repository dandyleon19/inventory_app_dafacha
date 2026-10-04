export interface ApiErrorBody {
  timestamp?: string
  status?: number
  error?: string
  code?: string
  message?: string
  path?: string
}

export function parseApiError(err: unknown): ApiErrorBody | null {
  if (!err || typeof err !== "object") return null

  const fetchError = err as {
    data?: ApiErrorBody
    status?: number
    statusCode?: number
  }

  if (!fetchError.data || typeof fetchError.data !== "object") {
    return null
  }

  return {
    ...fetchError.data,
    status:
      fetchError.data.status ?? fetchError.status ?? fetchError.statusCode,
  }
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const body = parseApiError(err)

  if (!body?.message) {
    return fallback
  }

  return body.message
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
}

export function getApiErrorTitle(err: unknown): string {
  const body = parseApiError(err)
  const status = body?.status

  switch (body?.code) {
    case "CONFLICT":
      return "Conflicto"
    case "VALIDATION_ERROR":
      return "Datos inválidos"
    case "BAD_REQUEST":
      return "Solicitud inválida"
    case "NOT_FOUND":
      return "No encontrado"
    case "FORBIDDEN":
      return "Sin permisos"
    case "UNAUTHORIZED":
      return "No autorizado"
  }

  if (status === 409) return "Conflicto"
  if (status === 404) return "No encontrado"
  if (status === 403) return "Sin permisos"
  if (status === 401) return "No autorizado"
  if (status === 400) return "Solicitud inválida"

  return "Error"
}
