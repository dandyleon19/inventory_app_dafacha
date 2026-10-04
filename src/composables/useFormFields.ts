export const useFormFields = () => {
  const field = {
    variant: "outlined" as const,
    density: "comfortable" as const,
    rounded: "lg",
    color: "primary",
    hideDetails: "auto" as const,
  }

  const textarea = {
    ...field,
    autoGrow: true,
    rows: 3,
  }

  const select = {
    ...field,
  }

  const autocomplete = {
    ...select,
  }

  return { field, textarea, select, autocomplete }
}
