export const validationRules = {
  required: (value: string | number | boolean | null | undefined) =>
      (value !== null && value !== undefined && value !== '') ||
      "Este campo es requerido",

  email: (value: string) =>
      /^\S+@\S+\.\S+$/.test(value) ||
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
