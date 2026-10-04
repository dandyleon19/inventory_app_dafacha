export type NotificationType = "success" | "error" | "info" | "warning"

export interface NotificationState {
  visible: boolean
  message: string
  type: NotificationType
  title?: string
  timeout?: number
}

const defaultState = (): NotificationState => ({
  visible: false,
  message: "",
  type: "info",
  title: undefined,
  timeout: 4000,
})

export const useNotification = () => {
  const notification = useState<NotificationState>("app-notification", defaultState)

  const show = (options: {
    message: string
    type?: NotificationType
    title?: string
    timeout?: number
  }) => {
    notification.value = {
      visible: true,
      message: options.message,
      type: options.type ?? "info",
      title: options.title,
      timeout: options.timeout ?? (options.type === "success" ? 2500 : 5000),
    }
  }

  const success = (message: string, title?: string) =>
    show({ message, type: "success", title })

  const error = (message: string, title?: string) =>
    show({ message, type: "error", title })

  const hide = () => {
    notification.value.visible = false
  }

  return { notification, show, success, error, hide }
}
