/**
 * How many side panels (form drawers) are open right now. The bottom navigation of the phone layout hides while
 * any is open, so it never covers the panel's own buttons ("Guardar", "Registrar salida"...).
 */
export const useOverlayState = () => {
  const openCount = useState<number>("overlay-open-count", () => 0)

  const opened = () => {
    openCount.value += 1
  }

  const closed = () => {
    openCount.value = Math.max(0, openCount.value - 1)
  }

  const anyOpen = computed(() => openCount.value > 0)

  return { anyOpen, opened, closed }
}
