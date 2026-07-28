<script setup lang="ts">
import { useCommission } from '@/composables/useCommission'
import type { CommissionLevel } from '@/api/commission'

/**
 * Переключатель уровней/фаз (L1–L5).
 * L5 — финальный handoff в Telegram.
 * Скрыть: VITE_HIDE_PHASE_BAR=1.
 */
const { level, phase, applyAdminLevel } = useCommission()

const levels = [1, 2, 3, 4, 5] as const satisfies readonly CommissionLevel[]

function setLevel(next: CommissionLevel): void {
  applyAdminLevel(next)
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
  </div>
</template>
