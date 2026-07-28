<script setup lang="ts">
import { ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * После первого просмотра сертификата CPI: галочка «видел» + подтверждение.
 * Без галочки кнопка Confirm неактивна.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const uid = useId()
const titleId = `vel-cpi-confirm-title-${uid}`
const leadId = `vel-cpi-confirm-lead-${uid}`
const checkId = `vel-cpi-confirm-check-${uid}`

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const checked = ref(false)

watch(open, (isOpen) => {
  if (isOpen) checked.value = false
})

function onConfirm(): void {
  if (!checked.value) return
  open.value = false
  emit('confirm')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-cpi-confirm"
    data-testid="cpi-view-confirm"
    :aria-labelledby="titleId"
    :aria-describedby="leadId"
  >
    <form class="vel-cpi-confirm__form" @submit.prevent="onConfirm">
      <div class="flex items-start gap-3">
        <span class="vel-cpi-confirm__mark" aria-hidden="true">
          <VelAccountSign sign="shield-check" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commission.cpi.confirmView.overline') }}</p>
          <h2 :id="titleId" class="vel-cpi-confirm__title">
            {{ t('account.commission.cpi.confirmView.title') }}
          </h2>
        </div>
      </div>

      <p :id="leadId" class="vel-cpi-confirm__lead">
        {{ t('account.commission.cpi.confirmView.body') }}
      </p>

      <label class="vel-cpi-confirm__check" :for="checkId">
        <input
          :id="checkId"
          v-model="checked"
          type="checkbox"
          class="vel-cpi-confirm__input"
          data-testid="cpi-view-confirm-check"
        />
        <span class="vel-cpi-confirm__box" aria-hidden="true">
          <svg v-if="checked" class="vel-cpi-confirm__tick" viewBox="0 0 24 24" fill="none">
            <path
              d="m6.5 12.2 3.6 3.5 7.4-8"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="vel-cpi-confirm__check-txt">
          {{ t('account.commission.cpi.confirmView.checkbox') }}
        </span>
      </label>

      <VelButton
        type="submit"
        block
        size="lg"
        :disabled="!checked"
        data-testid="cpi-view-confirm-cta"
      >
        {{ t('account.commission.cpi.confirmView.cta') }}
      </VelButton>
    </form>
  </dialog>
</template>

<style scoped>
.vel-cpi-confirm {
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

.vel-cpi-confirm::backdrop {
  background: color-mix(in oklab, var(--color-fg) 42%, transparent);
  backdrop-filter: blur(4px);
}

.vel-cpi-confirm__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.35rem 1.35rem 1.45rem;
}

.vel-cpi-confirm__mark {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--color-success);
}

.vel-cpi-confirm__title {
  margin: 0.15rem 0 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.vel-cpi-confirm__lead {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.vel-cpi-confirm__check {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
  cursor: pointer;
  user-select: none;
}

.vel-cpi-confirm__check:hover {
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-line));
}

.vel-cpi-confirm__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.vel-cpi-confirm__box {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.05rem;
  border: 2px solid color-mix(in oklab, var(--color-accent) 55%, var(--color-line));
  border-radius: 0.35rem;
  background: #fff;
  color: var(--color-accent);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.vel-cpi-confirm__input:checked + .vel-cpi-confirm__box {
  border-color: var(--color-accent);
  background: color-mix(in oklab, var(--color-accent) 12%, #fff);
}

.vel-cpi-confirm__input:focus-visible + .vel-cpi-confirm__box {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.vel-cpi-confirm__tick {
  width: 0.95rem;
  height: 0.95rem;
}

.vel-cpi-confirm__check-txt {
  flex: 1;
  min-width: 0;
  color: var(--color-fg);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
}
</style>
