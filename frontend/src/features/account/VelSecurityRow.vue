<script setup lang="ts">
/**
 * Строка раздела «Безопасность»: слева объяснение, справа действие.
 *
 * Отдельный файл, потому что строк три и они обязаны выглядеть одинаково:
 * при повторе разметки внутри панели у одной из них рано или поздно разъедется
 * то отступ, то положение кнопки. Здесь же лежит и разделитель между строками —
 * он принадлежит не панели, а стыку двух строк.
 *
 * Содержимого своего у строки нет: заголовок и текст приходят пропсами,
 * пометка состояния и кнопка — слотами, дополнительный блок (поле кода) —
 * слотом по умолчанию, и он занимает всю ширину под строкой.
 */
interface Props {
  /** Заголовок строки. Есть только у той, где он что-то добавляет к тексту. */
  title?: string
  /**
   * Объяснение. Необязательно: строка подтверждения почты, когда почта уже
   * подтверждена, состоит из заголовка и пометки — призыв «подтвердите адрес»
   * рядом с пометкой «подтверждена» противоречил бы сам себе.
   */
  text?: string
}

defineProps<Props>()
</script>

<template>
  <div class="vel-security-row">
    <div class="flex flex-col gap-1.5">
      <div v-if="title !== undefined || $slots.status" class="flex flex-wrap items-center gap-2.5">
        <h3 v-if="title !== undefined" class="text-sm font-semibold text-fg">{{ title }}</h3>
        <slot name="status" />
      </div>

      <p v-if="text !== undefined" class="text-sm text-muted">{{ text }}</p>
    </div>

    <div class="vel-security-row__action">
      <slot name="action" />
    </div>

    <!-- Дополнительный блок всегда во всю ширину строки: 1 / -1 работает
         и в одной колонке, и в двух, тогда как «занять две» создало бы
         на узкой раскладке вторую, пустую. -->
    <div v-if="$slots.default" class="vel-security-row__extra">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.vel-security-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 0.875rem;
  margin-block: 0.65rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-ground) 65%, var(--color-surface));
}

/*
  Разделитель ставит себе вторая и каждая следующая строка. Так у первой нет
  лишней черты под заголовком раздела, а у последней — над краем панели.
  Селектор работает между двумя экземплярами одного компонента: атрибут
  области видимости у них общий.
*/
.vel-security-row + .vel-security-row {
  /* Карточки отделены margin, без второй черты */
  border-block-start: 1px solid var(--color-line);
}

.vel-security-row__action {
  justify-self: start;
}

.vel-security-row__extra {
  grid-column: 1 / -1;
}

/*
  Кнопку рядом с текстом ставит ШИРИНА ПАНЕЛИ, а не ширина окна: раздел живёт
  в боковой колонке кабинета (336px на большом экране), и запрос к окну
  разводил бы строку на две колонки именно там, где места нет. Замерено на
  1265px: объяснение получало 119px против 153px у кнопки, текст ломался
  на четыре строки. Теперь при узкой панели кнопка встаёт под текстом.

  Контейнер именованный: без имени сработал бы ближайший внешний, какой бы
  ни оказался, а с именем строка просто остаётся в одну колонку, если её
  положили вне панели безопасности.
*/
@container vel-security (min-width: 26rem) {
  .vel-security-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .vel-security-row__action {
    justify-self: end;
  }
}
</style>
