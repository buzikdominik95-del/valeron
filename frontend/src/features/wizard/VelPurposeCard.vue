<script setup lang="ts">
import VelPurposeIcon from '@/features/wizard/VelPurposeIcon.vue'
import type { CreditPurpose } from '@/types/velora'

/**
 * Карточка выбора цели.
 *
 * Под карточкой лежит настоящий <input type="radio">, а вся плитка — его
 * <label>. Это даёт стрелки на клавиатуре, объявление «выбрано N из 5»
 * и группировку скринридером без единого ARIA-атрибута. Кнопками с
 * aria-checked то же самое пришлось бы собирать руками и хуже.
 */
interface Props {
  purpose: CreditPurpose
  name: string
  title: string
  hint: string
  checked: boolean
}

defineProps<Props>()

defineEmits<{ select: [value: CreditPurpose] }>()
</script>

<template>
  <label class="vel-purpose" :class="{ 'is-checked': checked }">
    <input
      class="vel-purpose__input"
      type="radio"
      :name="name"
      :value="purpose"
      :checked="checked"
      @change="$emit('select', purpose)"
    />

    <span class="vel-purpose__mark">
      <VelPurposeIcon :purpose="purpose" />
    </span>

    <span class="text-sm font-semibold text-fg">{{ title }}</span>
    <span class="text-xs text-muted">{{ hint }}</span>
  </label>
</template>

<style scoped>
.vel-purpose {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1.25rem;
  text-align: center;
  cursor: pointer;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.vel-purpose:hover {
  border-color: var(--color-accent);
}

/* Нажатие: у плитки были покой, наведение, фокус и «выбрано», отклика на
   палец не было — а на тач-экране это единственное состояние между касанием
   и результатом. Подложка, а не рамка: рамку уже занимают наведение и выбор. */
.vel-purpose:active {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
}

/* Рамка в два пикселя, а не смена цвета: выбранное состояние обязано
   читаться и без цвета — на монохромном экране, при дальтонизме. */
.vel-purpose.is-checked {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
  background-color: var(--color-raised);
}

/* Радиокнопка нужна ради семантики и клавиатуры, но не видна:
   sr-only, а не display:none — иначе она выпадет из порядка табуляции. */
.vel-purpose__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Фокус приходит на скрытый input — кольцо рисуем на всей плитке. */
.vel-purpose__input:focus-visible ~ .vel-purpose__mark {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.vel-purpose__mark {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-round);
  background-color: var(--color-raised);
  color: var(--color-accent);
  transition: background-color 150ms ease;
}

.vel-purpose.is-checked .vel-purpose__mark {
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/*
  ЗНАК ОЖИВАЕТ ПОД КУРСОРОМ. Небольшой подъём с увеличением: плитка отвечает
  на наведение не только рамкой, и глаз ведут к тому, что на ней главное, —
  к знаку цели, а не к её краю.

  Сглаживание с перелётом (последняя точка кривой больше единицы): знак чуть
  проскакивает конечный размер и возвращается. На 200мс это читается как
  живой предмет, а линейный подъём — как перерисовка.

  Двигаем сам svg, а не .vel-purpose__mark: круг под знаком меняет заливку при
  выборе, и масштабировать его значило бы дёргать цветное пятно 48×48 —
  крупное движение вместо мелкого. :deep нужен потому, что svg приходит из
  дочернего компонента: его корню достаётся наш scope-атрибут, но правило
  всё равно честнее написать явно.

  @media (hover: hover) — на тач-экране :hover прилипает после тапа, и знак
  остался бы поднятым до следующего касания в другом месте. Там за отклик
  отвечает :active ниже.
*/
.vel-purpose :deep(.vel-purpose-icon) {
  transition: transform 200ms cubic-bezier(0.34, 1.4, 0.64, 1);
}

@media (hover: hover) {
  .vel-purpose:hover :deep(.vel-purpose-icon) {
    transform: translateY(-2px) scale(1.08);
  }
}

/* Палец получает встречное движение: знак проседает под нажатием. */
.vel-purpose:active :deep(.vel-purpose-icon) {
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .vel-purpose,
  .vel-purpose__mark {
    transition: none;
  }

  /*
    Глобальный сброс в main.css правит только длительность перехода — сам сдвиг
    остался бы и срабатывал мгновенным скачком. Снимаем и переход, и обе
    трансформации: под этой настройкой знак обязан стоять неподвижно.
  */
  .vel-purpose :deep(.vel-purpose-icon),
  .vel-purpose:hover :deep(.vel-purpose-icon),
  .vel-purpose:active :deep(.vel-purpose-icon) {
    transition: none;
    transform: none;
  }
}
</style>
