import { defineComponent, h } from "vue"
import { VTextField } from "vuetify/components"

/**
 * Stands in for ProductPicker (which searches the products on the server): a form spec picks a product by emitting
 * `update:modelValue` and `select` on it, exactly what the real picker does when the user chooses one. It keeps the
 * picker's `rules`, so a line without a product is still refused by the form's validation.
 */
export const ProductPickerStub = defineComponent({
  name: "ProductPickerStub",
  props: {
    modelValue: { type: Number, default: null },
    initial: { type: Object, default: null },
    label: { type: String, default: "Producto" },
    rules: { type: Array, default: () => [] },
    density: { type: String, default: undefined },
  },
  emits: ["update:modelValue", "select"],
  render() {
    return h(VTextField, {
      modelValue: this.modelValue === null ? "" : String(this.modelValue),
      label: this.label,
      rules: this.rules as any,
    })
  },
})
