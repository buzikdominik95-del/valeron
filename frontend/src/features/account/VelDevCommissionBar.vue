<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import type { CommissionLevel } from '@/api/commission'
import VelApprovalEmailPreview from '@/features/account/VelApprovalEmailPreview.vue'

/**
 * Переключатель уровней/фаз (L1–L4) + кнопка превью письма «credito approvato».
 * L5 снят: финал TG — после отказной анимации L4 (phase tg_final).
 * Скрыть: VITE_HIDE_PHASE_BAR=1.
 */
const { t } = useI18n()
const { level, phase, applyAdminLevel } = useCommission()

const levels = [1, 2, 3, 4] as const satisfies readonly CommissionLevel[]
const emailOpen = ref(false)

function setLevel(next: CommissionLevel): void {
  applyAdminLevel(next)
}

function showApprovalEmail(): void {
  emailOpen.value = true
}
</script>

<template>
  <!-- Отступ снизу: нижняя навигация кабинета до lg (см. VelCabinetNav). -->
  <div
    class="fixed bottom-20 right-3 z-[80] flex max-w-[16rem] flex-col gap-2 rounded-panel border border-line bg-surface p-3 shadow-lg lg:bottom-4"
    data-testid="dev-commission-bar"
  >
    <p class="m-0 text-xs font-semibold text-fg">
      Phase · L{{ level }} · {{ phase }}
    </p>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="lv in levels"
        :key="lv"
        type="button"
        class="min-h-9 min-w-9 rounded-control border border-line-strong bg-ground px-2.5 text-xs font-semibold text-fg hover:border-accent hover:bg-raised"
        :class="lv === level ? 'border-accent bg-accent/15 text-accent-deep' : ''"
        :aria-pressed="lv === level"
        @click="setLevel(lv)"
      >
        L{{ lv }}
      </button>
    </div>

    <button
      type="button"
      class="vel-devbar-mail"
      data-testid="dev-approval-email"
      @click="showApprovalEmail"
    >
      <svg class="vel-devbar-mail__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          stroke-width="1.75"
        />
        <path
          d="m5.5 8 6.2 4.2c.2.14.46.14.66 0L18.5 8"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ t('account.approvalEmail.devBtn') }}
    </button>
  </div>

  <VelApprovalEmailPreview v-model:open="emailOpen" />
</template>

<style scoped>
.vel-devbar-mail {
  display: inline-flex;
  width: 100%;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.4rem 0.55rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-ground));
  color: var(--color-accent-deep);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;
}

.vel-devbar-mail:hover {
  border-color: var(--color-accent);
  background: color-mix(in oklab, var(--color-accent) 16%, var(--color-surface));
}

.vel-devbar-mail__ico {
  width: 0.95rem;
  height: 0.95rem;
  flex: none;
}
</style>
