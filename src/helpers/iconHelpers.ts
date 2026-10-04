import { h } from "vue"
import { Icon } from "#components"
import type { IconProps } from "vuetify"
import { resolveAppIcon } from "~/constants/appIcons"

const VUETIFY_ICON_SIZES: Record<string, number> = {
  "x-small": 16,
  small: 20,
  default: 24,
  large: 28,
  "x-large": 32,
}

export function resolveVuetifyIconSize(size: IconProps["size"]): string | undefined {
  if (
    size == null ||
    size === false ||
    size === true ||
    size === "" ||
    size === "default"
  ) {
    return undefined
  }

  if (typeof size === "number" && Number.isFinite(size)) {
    return `${size}px`
  }

  if (typeof size === "string") {
    const mapped = VUETIFY_ICON_SIZES[size]
    if (mapped) return `${mapped}px`

    const numeric = Number(size)
    if (Number.isFinite(numeric)) return `${numeric}px`
  }

  return "24px"
}

export function createHybridIconSet() {
  return {
    component: (props: IconProps) => {
      const resolvedSize = resolveVuetifyIconSize(props.size)

      return h(Icon, {
        name: resolveAppIcon(String(props.icon ?? "")),
        ...(resolvedSize ? { size: resolvedSize } : {}),
        class: props.class,
        mode: "svg",
      })
    },
  }
}
