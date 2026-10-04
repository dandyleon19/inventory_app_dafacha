import { getApiErrorMessage, getApiErrorTitle } from "~/helpers/apiErrorHelpers"

export const useApiNotification = () => {
  const { success, error } = useNotification()

  const getErrorMessage = (err: unknown, fallback: string): string => {
    const apiMessage = getApiErrorMessage(err, "")
    if (apiMessage) return apiMessage

    if (err && typeof err === "object") {
      const fetchError = err as {
        data?: { message?: string; error?: string }
        statusMessage?: string
      }

      if (fetchError.data?.message) return fetchError.data.message
      if (fetchError.data?.error) return fetchError.data.error
      if (fetchError.statusMessage) return fetchError.statusMessage
    }

    return fallback
  }

  const notifyCreated = (entity: string) => {
    success(`El ${entity} se creó correctamente.`, "Registro creado")
  }

  const notifyUpdated = (entity: string) => {
    success(`El ${entity} se actualizó correctamente.`, "Registro actualizado")
  }

  const notifyDeleted = (entity: string) => {
    success(`El ${entity} se eliminó correctamente.`, "Registro eliminado")
  }

  const notifyError = (err: unknown, action: string, fallback?: string) => {
    error(
      getErrorMessage(err, fallback ?? `No se pudo ${action}.`),
      getApiErrorTitle(err)
    )
  }

  return {
    success,
    error,
    getErrorMessage,
    notifyCreated,
    notifyUpdated,
    notifyDeleted,
    notifyError,
  }
}
