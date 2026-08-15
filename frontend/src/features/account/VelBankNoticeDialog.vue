<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Этап 2: окно «данные отправлены в банк» (5–10 мин) ДО анимации перевода.
 * После «Продолжить» запускается 7-минутная анимация.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ continue: [] }>()

const { t } = useI18n()
const uid = useId()
const titleId = `vel-bank-notice-title-${uid}`
const leadId = `vel-bank-notice-lead-${uid}`

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

function onContinue(): void {
  open.value = false
  emit('continue')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-bn"
    data-testid="bank-notice"
    :aria-labelledby="titleId"
    :aria-describedby="leadId"
  >
    <form class="vel-bn__form" @submit.prevent="onContinue">
      <div class="flex items-start gap-3">
        <VelAccountSign sign="bank" size="lg" class="shrink-0 text-accent-deep" />
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commission.bankNotice.overline') }}</p>
          <h2 :id="titleId" class="vel-bn__title">
            {{ t('account.commission.bankNotice.title') }}
          </h2>
        </div>
      </div>

      <p :id="leadId" class="vel-bn__lead">
        {{ t('account.commission.bankNotice.body') }}
      </p>

      <div class="vel-bn__eta rounded-control border border-line bg-ground px-3 py-2">
        <span class="vel-label">{{ t('account.commission.bankNotice.etaLabel') }}</span>
        <p class="m-0 text-sm font-semibold text-accent-deep">
          {{ t('account.commission.bankNotice.eta') }}
        </p>
      </div>

      <VelButton type="submit" block size="lg" data-testid="bank-notice-continue">
        {{ t('account.commission.bankNotice.cta') }}
      </VelButton>

    </form>
  </dialog>
</template>

<style scoped>
.vel-bn {
  inline-size: min(100% - 2rem, 28rem);
  max-block-size: min(90dvh, 36rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-bn::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-bn__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.vel-bn__title {
  margin: 0.25rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-fg);
}

.vel-bn__lead {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.vel-bn__eta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
