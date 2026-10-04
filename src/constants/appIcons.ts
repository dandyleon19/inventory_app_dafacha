export const APP_ICON_SET = "tabler" as const

/** Single source of truth for icons. Add new ones here and reference them by key. */
export const APP_ICONS = {
  dashboard: "tabler:layout-dashboard",
  users: "tabler:users",
  user: "tabler:user",
  menu: "tabler:menu-2",
  menuCollapse: "tabler:layout-sidebar-left-collapse",
  menuExpand: "tabler:layout-sidebar-left-expand",
  close: "tabler:x",
  cancel: "tabler:ban",
  chevronDown: "tabler:chevron-down",
  chevronUp: "tabler:chevron-up",
  chevronLeft: "tabler:chevron-left",
  chevronRight: "tabler:chevron-right",
  arrowLeft: "tabler:arrow-left",
  logout: "tabler:logout",
  plus: "tabler:plus",
  search: "tabler:search",
  help: "tabler:help-circle",
  list: "tabler:list",
  edit: "tabler:pencil",
  delete: "tabler:trash",
  view: "tabler:eye",
  eyeOff: "tabler:eye-off",
  email: "tabler:mail",
  lock: "tabler:lock",
  calendar: "tabler:calendar",
  checkCircle: "tabler:circle-check",
  closeCircle: "tabler:circle-x",
  circle: "tabler:circle",
  playCircle: "tabler:player-play",
  package: "tabler:package",
  tags: "tabler:tags",
  reset: "tabler:restore",
  bell: "tabler:bell",
  expiry: "tabler:calendar-x",
  lowStock: "tabler:package-off",
  purchaseOrder: "tabler:clipboard-list",
  receive: "tabler:package-import",
  send: "tabler:send",
  stock: "tabler:packages",
  movements: "tabler:arrows-exchange",
  history: "tabler:history",
  entry: "tabler:circle-plus",
  exit: "tabler:circle-minus",
  adjustment: "tabler:adjustments",
  transfer: "tabler:transfer",
  warehouse: "tabler:building-warehouse",
  truckDelivery: "tabler:truck-delivery",
  settings: "tabler:settings",
  audit: "tabler:clipboard-text",
  key: "tabler:key",
  shield: "tabler:shield-check",
  success: "tabler:circle-check",
  error: "tabler:alert-circle",
  info: "tabler:info-circle",
  warning: "tabler:alert-triangle",
} as const

export type AppIconName = (typeof APP_ICONS)[keyof typeof APP_ICONS]

export const isIconifyIcon = (value?: string | null) =>
  Boolean(value && value.includes(":"))

export const resolveAppIcon = (icon?: string | null): string => {
  if (!icon) return APP_ICONS.help

  if (isIconifyIcon(icon)) return icon

  return APP_ICONS.help
}
