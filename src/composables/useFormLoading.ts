import type { Ref } from "vue"

type MaybeRef<T> = T | Ref<T>

export function useStoresLoading(
  stores: Array<{ loading: MaybeRef<boolean> }>
) {
  return computed(() =>
    stores.some((store) => Boolean(unref(store.loading)))
  )
}

export function useFormLoading(
  options: {
    action: MaybeRef<"create" | "update" | string>
    stores?: Array<{ loading: MaybeRef<boolean> }>
    recordLoading?: MaybeRef<boolean>
  }
) {
  return computed(() => {
    if (options.recordLoading && unref(options.recordLoading)) {
      return true
    }

    if (unref(options.action) === "update" && options.stores?.length) {
      return options.stores.some((store) => Boolean(unref(store.loading)))
    }

    if (unref(options.action) === "create" && options.stores?.length) {
      return options.stores.some((store) => Boolean(unref(store.loading)))
    }

    return false
  })
}
