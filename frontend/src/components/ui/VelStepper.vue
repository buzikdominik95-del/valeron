<script setup lang="ts">
import { inject } from 'vue'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'

/**
 * Пара кнопок «−/+» с показом значения. Это группа, а не один контрол,
 * поэтому подпись поля подключается через aria-labelledby, а не через
 * <label for> — на <div> он не работает.
 */
interface Props {
  /** Уже отформатированное значение — форматирование живёт снаружи. */
  display: string
  canDecrease?: boolean
  canIncrease?: boolean
  decreaseLabel: string
  increaseLabel: string
}

defineProps<Props>()

defineEmits<{
  decrease: []
  increase: []
}>()

const field = inject(VEL_FIELD_KEY, null)
</script>

<template>
  <div
    class="grid h-14 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center rounded-control border border-line-strong bg-ground"
    role="group"
    :aria-labelledby="field?.labelId"
  >
    <button
      class="vel-step"
      type="button"
      :aria-label="decreaseLabel"
      :disabled="canDecrease === false"
      @click="$emit('decrease')"
    >
      −
    </button>

    <span class="vel-num text-center text-2xl">{{ display }}</span>

    <button
      class="vel-step"
      type="button"
      :aria-label="increaseLabel"
      :disabled="canIncrease === false"
      @click="$emit('increase')"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.vel-step {
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--color-fg);
  font: inherit;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition: color 150ms ease;
}

.vel-step:hover:not(:disabled) {
  color: var(--color-accent);
}

/* Нажатие: у кнопки были покой, наведение, фокус и блокировка, отклика на
   палец не было — на тач-экране наведения не существует, и до пересчёта
   суммы кнопка не отвечала ничем. Заливка, а не цвет знака: цвет уже занят
   наведением, и два состояния были бы неотличимы. */
.vel-step:active:not(:disabled) {
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-step:disabled {
  color: var(--color-faint);
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .vel-step {
    transition: none;
  }
}
</style>
