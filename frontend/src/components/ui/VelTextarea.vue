<script setup lang="ts">
import { computed, inject } from 'vue'
import { cn } from '@/lib/cn'
import { useControlAttrs } from '@/composables/useControlAttrs'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'

/**
 * Многострочный ввод в том же языке, что VelInput:
 * id/aria от VelField, без инлайн-стилей, Tailwind-классы ролями.
 */
interface Props {
  rows?: number
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
}

withDefaults(defineProps<Props>(), {
  rows: 5,
})

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: '' })

const field = inject(VEL_FIELD_KEY, null)
const { externalClass, passThrough } = useControlAttrs()

const controlId = computed(
  () => field?.controlId ?? (passThrough.value['id'] as string | undefined),
)

const areaClass = computed(() =>
  cn(
    'min-h-28 w-full resize-y rounded-control border bg-ground',
    'px-3.5 py-3 text-sm leading-relaxed transition-colors duration-150',
    'placeholder:text-muted',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'read-only:bg-raised read-only:opacity-90',
    field?.invalid === true ? 'border-danger' : 'border-line-strong hover:border-accent',
    externalClass.value,
  ),
)
</script>

<template>
  <textarea
    v-bind="passThrough"
    :id="controlId"
    v-model="model"
    :class="areaClass"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="field?.invalid === true ? true : undefined"
    :aria-describedby="field?.describedBy"
  />
</template>
