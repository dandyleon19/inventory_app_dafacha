export const validationRules = {
  // A text of only spaces counts as empty, like the backend's @NotBlank (otherwise the API would answer 400).
  required: (value: string | number | boolean | null | undefined) =>
      (value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '')) ||
      "Este campo es requerido",

  // Forms trim the email before sending it, so spaces around a pasted address are not a reason to refuse it.
  email: (value: string) =>
      /^\S+@\S+\.\S+$/.test(String(value ?? '').trim()) ||
      "Correo inválido",

  number: (value: string | number) =>
      !isNaN(Number(value)) ||
      "Debe ser un número válido",

  nonNegative: (value: string | number | null | undefined) =>
      value === null || value === undefined || value === '' ||
      Number(value) >= 0 ||
      "Debe ser mayor o igual a 0",

  /** At most `max` decimal places, e.g. money with 2 or unit costs with 4. */
  maxDecimals:
      (max: number) =>
          (value: string | number | null | undefined) =>
              value === null || value === undefined || value === '' ||
              new RegExp(`^-?\\d+(\\.\\d{1,${max}})?$`).test(String(value)) ||
              `Máximo ${max} decimales`,

  /** At most `max` digits before the decimal point (the backend's @Digits(integer = ...) would answer 400). */
  maxIntegerDigits:
      (max: number) =>
          (value: string | number | null | undefined) =>
              value === null || value === undefined || value === '' ||
              new RegExp(`^-?\\d{1,${max}}(\\.\\d*)?$`).test(String(value)) ||
              `Máximo ${max} dígitos enteros`,

  maxLength:
      (max: number) =>
          (value: string | null | undefined) =>
              !value ||
              value.length <= max ||
              `Máximo ${max} caracteres`,

  minLength:
      (min: number) =>
          (value: string | null | undefined) =>
              (value?.length ?? 0) >= min ||
              `Debe tener al menos ${min} caracteres`,
}
