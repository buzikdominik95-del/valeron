<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'
import { useControlAttrs } from '@/composables/useControlAttrs'

interface Props {
  /** Подсветить акцентом — для одного ключевого факта на экране. */
  accent?: boolean
}

const props = defineProps<Props>()

defineOptions({ inheritAttrs: false })

const { externalClass, passThrough } = useControlAttrs()

const badgeClass = computed(() =>
  cn(
    'inline-flex items-center gap-2 rounded-control border px-3 py-1.5 text-xs',
    props.accent === true
      ? 'border-accent bg-accent text-accent-ink'
      : 'border-line-strong text-muted',
    externalClass.value,
  ),
)
</script>

<template>
  <span v-bind="passThrough" :class="badgeClass">
    <slot />
  </span>
</template>
