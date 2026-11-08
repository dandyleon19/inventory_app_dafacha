import { flushPromises } from "@vue/test-utils"
import type { VueWrapper } from "@vue/test-utils"

/** The Vuetify input (text field, textarea, select, switch...) whose label contains `label`. */
export const findInput = (wrapper: VueWrapper<any>, label: string | RegExp) => {
  const matches = wrapper.findAllComponents(".v-input").filter((input) => {
    const text = String(input.props("label") ?? "")
    return typeof label === "string" ? text.includes(label) : label.test(text)
  })
  if (matches.length === 0) {
    const labels = wrapper.findAllComponents(".v-input").map((input) => String(input.props("label") ?? ""))
    throw new Error(`No input labelled ${String(label)}. Labels found: ${labels.join(" | ")}`)
  }
  return matches[0]!
}

/** Types into / selects on the input with that label, as the user would (goes through v-model). */
export const fill = async (wrapper: VueWrapper<any>, label: string | RegExp, value: unknown) => {
  findInput(wrapper, label).vm.$emit("update:modelValue", value)
  await flushPromises()
}

/** Fills several inputs: `{ "Nombre": "Ana", "Correo": "a@b.co" }`. */
export const fillAll = async (wrapper: VueWrapper<any>, values: Record<string, unknown>) => {
  for (const [label, value] of Object.entries(values)) {
    await fill(wrapper, label, value)
  }
}

/** Presses the submit button: the form validates and, only when it is valid, emits `submit`. */
export const submit = async (wrapper: VueWrapper<any>) => {
  await wrapper.find("form").trigger("submit")
  await flushPromises()
  // Vuetify validates asynchronously: give its rules a second turn.
  await flushPromises()
}

/** The payloads the form emitted with `submit`. */
export const submitted = (wrapper: VueWrapper<any>) => (wrapper.emitted("submit") ?? []).map((args) => args[0])

/** The validation messages the form shows right now. */
export const errorMessages = (wrapper: VueWrapper<any>) =>
  wrapper.findAll(".v-messages__message").map((message) => message.text())
