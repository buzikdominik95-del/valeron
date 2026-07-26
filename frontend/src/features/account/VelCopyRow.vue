<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import VelButton from '@/components/ui/VelButton.vue'

/** Строка «подпись · значение · копировать» для SEPA-реквизитов. */
const props = defineProps<{
  label: string
  value: string
  /** mono display (IBAN) */
  mono?: boolean
}>()

const { t } = useI18n()
const { copy, isSupported } = useClipboard()
const justCopied = ref(false)

const { start: clearCopied } = useTimeoutFn(
  () => {
    justCopied.value = false
  },
  1600,
  { immediate: false },
)

async function onCopy(): Promise<void> {
  if (!isSupported.value) return
  await copy(props.value)
  justCopied.value = true
  clearCopied()
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
    <div class="min-w-0">
      <p class="m-0 text-xs text-muted">{{ label }}</p>
      <p
        class="m-0 break-all text-sm font-medium text-fg"
        :class="mono ? 'vel-num tracking-wide' : ''"
      >
        {{ value }}
      </p>
    </div>
    <VelButton
      type="button"
      variant="outline"
      size="md"
      class="shrink-0"
      :disabled="!isSupported"
      @click="onCopy"
    >
      {{ justCopied ? t('account.payment.copied') : t('account.payment.copy') }}
    </VelButton>
  </div>
</template>
