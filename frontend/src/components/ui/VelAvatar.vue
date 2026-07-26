<script setup lang="ts">
import { computed } from 'vue'

/**
 * Круглый аватар с инициалами: «IK» для Ifraim Koch.
 *
 * ИНИЦИАЛЫ СЧИТАЮТСЯ, А НЕ ХРАНЯТСЯ. Вторая копия имени в виде строки «IK»
 * однажды разошлась бы с самим именем — человек сменил фамилию в профиле,
 * а кружок остался прежним. Здесь единственный источник — то же имя, что
 * стоит на экране рядом.
 *
 * ДВЕ БУКВЫ, А НЕ ОДНА: первая буква имени и первая буква фамилии. Если часть
 * одна (только имя, только фамилия) — остаётся одна буква, а не выдуманная
 * вторая из середины слова.
 *
 * ДЕКОР. Знак всегда стоит рядом с именем: в шапке — текстом (на узком экране
 * доступным только скринридеру), в карточке клиента — заголовком. Второе
 * чтение «И К» ничего не добавляет, поэтому aria-hidden.
 *
 * Размер задаёт вызывающий через --vel-avatar-size на любом родителе:
 * инлайн-стилей в шаблонах нет, а проп с тремя размерами держал бы в скрипте
 * таблицу, которая всё равно живёт в CSS вызывающего блока.
 *
 * Лежит в components/ui, а не в features/account: про кабинет знак не знает
 * ничего — берёт имя пропом. Тем же кружком подписаны консультант в чате
 * поддержки и любой другой человек на экране.
 */
interface Props {
  /** Имя целиком, как оно показано рядом. Пустое — кружок остаётся пустым. */
  name: string
}

const props = defineProps<Props>()

/** Первая буква строки. Array.from, а не [0]: индекс режет суррогатную пару. */
function firstLetter(value: string): string {
  return Array.from(value)[0] ?? ''
}

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter((part) => part !== '')
  if (parts.length === 0) return ''

  const first = parts[0] ?? ''
  // Берём последнюю часть, а не вторую: у «Maria Anna Rossi» инициалы MR.
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''

  return `${firstLetter(first)}${firstLetter(last)}`.toLocaleUpperCase()
})
</script>

<template>
  <span class="vel-avatar" aria-hidden="true">{{ initials }}</span>
</template>

<style scoped>
.vel-avatar {
  display: inline-flex;
  inline-size: var(--vel-avatar-size, 2rem);
  block-size: var(--vel-avatar-size, 2rem);
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  /* Круглая форма читается как человек, а не как ещё одна панель.
     Значение из токена — произвольных радиусов в системе нет. */
  border-radius: var(--radius-round);
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
  /* Кегль от размера кружка: буквы не должны упираться в края при 2rem
     и теряться при 3.5rem. Замер: 0.42 от диаметра держит обе крайности. */
  font-size: calc(var(--vel-avatar-size, 2rem) * 0.42);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  user-select: none;
}
</style>
