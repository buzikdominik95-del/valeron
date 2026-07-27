<script setup lang="ts">
/**
 * Знаки экрана загрузки документа: три вида удостоверения, камера у пустого
 * слота и галочка у заполненного.
 *
 * ЗАЧЕМ СВОЙ НАБОР, А НЕ VelAccountIcon. Тот знает шаги заявки — «documents»
 * там один лист на весь раздел. Здесь же три вида документа обязаны
 * различаться ФОРМОЙ, а не только подписью: строки переключателя стоят
 * вплотную, и по одинаковым знакам глаз перестаёт их разделять. Паспорт —
 * книжка, карта — прямоугольная фотография, права — круглая.
 *
 * Линия, толщина 2, углы острые — той же породы, что VelAccountIcon и
 * VelCabinetIcon. Размер задаёт вызывающий через --vel-icon-size на любом
 * родителе: инлайн-стилей в шаблонах нет, а проп со списком размеров держал бы
 * в скрипте числа, которые всё равно живут в CSS блока.
 *
 * Декор: рядом с каждым знаком стоит текст, поэтому aria-hidden.
 */
defineProps<{ sign: 'identity' | 'passport' | 'idCard' | 'licence' | 'camera' | 'check' }>()
</script>

<template>
  <svg class="vel-doc-icon" viewBox="0 0 24 24" aria-hidden="true">
    <!-- Раздел целиком: карточка с человеком -->
    <g v-if="sign === 'identity'">
      <path d="M3.5 5.5h17v13h-17z" />
      <circle cx="9" cy="10.5" r="2" />
      <path d="M6 15.5c0-1.6 1.3-2.5 3-2.5s3 .9 3 2.5" />
      <path d="M14.5 10h4M14.5 13.5h4" />
    </g>

    <!-- Паспорт: книжка со знаком на обложке -->
    <g v-else-if="sign === 'passport'">
      <path d="M6 3.5h12v17H6z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9.5 16.5h5" />
    </g>

    <!-- Карта: прямоугольная фотография слева -->
    <g v-else-if="sign === 'idCard'">
      <path d="M3.5 5.5h17v13h-17z" />
      <path d="M6.5 8.5h5v6h-5z" />
      <path d="M14 9.5h4M14 13h4" />
    </g>

    <!-- Права: круглая фотография слева -->
    <g v-else-if="sign === 'licence'">
      <path d="M3.5 5.5h17v13h-17z" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M6 16.5h6" />
      <path d="M14 9.5h4M14 13h4" />
    </g>

    <!-- Камера: слот ждёт снимок -->
    <g v-else-if="sign === 'camera'">
      <path d="M3.5 8.5h4l1.5-2h6l1.5 2h4v10h-17z" />
      <circle cx="12" cy="13" r="3.5" />
    </g>

    <!-- Галочка: снимок выбран -->
    <path v-else d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </svg>
</template>

<style scoped>
.vel-doc-icon {
  /* Запасное значение: знак не обязан знать, кто его вставил */
  inline-size: var(--vel-icon-size, 1.25rem);
  block-size: var(--vel-icon-size, 1.25rem);
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
</style>
