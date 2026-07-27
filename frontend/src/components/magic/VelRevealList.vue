<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { useMutationObserver } from '@vueuse/core'

/**
 * Порт Magic UI-паттерна «поочерёдное проявление» без motion:
 * дети слота выезжают снизу и проявляются по очереди.
 *
 * Индекс раздаём из скрипта, а не через nth-child в scoped-стиле. Причина:
 * длина списка неизвестна (банки могут прийти из API), а nth-child потребовал
 * бы захардкодить потолок вроде :nth-child(12) — тринадцатая строка появилась
 * бы без задержки и вся очередь развалилась бы.
 */
interface Props {
  delayMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  delayMs: 90,
})

const root = ref<HTMLElement | null>(null)

watchEffect(
  () => {
    const element = root.value
    if (!element) return
    const step = Number.isFinite(props.delayMs) && props.delayMs >= 0 ? props.delayMs : 90
    element.style.setProperty('--vel-reveal-step', `${step}ms`)
  },
  { flush: 'post' },
)

function indexChildren(): void {
  const element = root.value
  if (!element) return

  let index = 0
  for (const child of Array.from(element.children)) {
    if (!(child instanceof HTMLElement)) continue

    // Уже размеченным детям индекс не переписываем: смена animation-delay
    // на лету перезапустила бы отыгранную анимацию, и старые строки моргнули
    // бы заново при добавлении новой.
    if (child.style.getPropertyValue('--vel-reveal-index') === '') {
      child.style.setProperty('--vel-reveal-index', String(index))
    }
    index += 1
  }
}

onMounted(indexChildren)

// Дети могут доехать позже (v-for по данным, которые ещё грузятся).
// Наблюдатель — из VueUse: он сам отцепится при размонтировании.
useMutationObserver(root, indexChildren, { childList: true })
</script>

<template>
  <div ref="root" class="vel-reveal">
    <slot />
  </div>
</template>

<style scoped>
.vel-reveal {
  --vel-reveal-step: 90ms;
  --vel-reveal-duration: 380ms;
}

/*
  :slotted() обязателен: содержимое слота компилируется в области видимости
  РОДИТЕЛЯ и обычного scope-атрибута этого компонента не несёт.
*/
:slotted(*) {
  animation: vel-reveal-in var(--vel-reveal-duration) ease-out backwards;
  animation-delay: calc(var(--vel-reveal-index, 0) * var(--vel-reveal-step));
}

@keyframes vel-reveal-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }

  to {
    /* transform в финальном кадре намеренно не задан: даже с fill-mode
       backwards конечное значение перебило бы наклон активной строки
       в VelBankRow, где transform ставится своим правилом */
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Гасим анимацию целиком, а не полагаемся на глобальный сброс из main.css:
    тот правит только animation-duration, а animation-delay оставляет. С
    fill-mode: both длинный список висел бы прозрачным ещё N × 90ms.
  */
  :slotted(*) {
    animation: none;
  }
}
</style>
