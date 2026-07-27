<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CabinetNavItem } from '@/composables/useCabinetNav'
import VelCabinetIcon from '@/features/account/VelCabinetIcon.vue'

/**
 * Один пункт меню кабинета: ячейка списка со ссылкой, значком и подписью.
 *
 * ОДНА РАЗМЕТКА, ДВА ОФОРМЛЕНИЯ. Пункт не знает, лежит он в нижней панели
 * (< 64rem) или в левой колонке: разметка одна, различаются только стили
 * внутри медиазапроса. Второй пункт под второй экран не заводится намеренно —
 * два дерева расходятся при первой же правке, и часть кабинета становится
 * недостижимой ровно на половине ширин.
 *
 * ЭТО ССЫЛКА, А НЕ ВКЛАДКА. У пункта настоящий href: раздел живёт в адресной
 * строке (?tab=…), значит его можно открыть в новой вкладке, скопировать
 * и переслать. Роль tab здесь была бы враньём — она обещает скринридеру
 * клавиатурную модель вкладок (стрелки, Home/End), а у нас обычный список
 * ссылок. Открытый раздел помечен aria-current="page".
 *
 * ЗНАЧОК И ПОДПИСЬ ВМЕСТЕ. Одного значка мало: без подписи «два пузырька»
 * читаются как что угодно, и на узком экране это первое, обо что спотыкаются.
 *
 * «ASSISTENZA» ВНЕ ЛОГИКИ АКТИВНОСТИ: он всегда подсвечен, потому что это
 * призыв к действию, а не просто раздел. Чтобы «всегда подсвечен» не съел
 * состояние «открыт сейчас», у активного добавляется светлое кольцо внутрь
 * заливки — плюс, разумеется, aria-current, который и есть настоящий ответ
 * на вопрос «где я».
 *
 * ЩЕЛЧОК НЕ ОБРАБАТЫВАЕТСЯ ЗДЕСЬ: событие уходит наверх как есть, вместе
 * с исходным MouseEvent. Разбор модификаторов и preventDefault живут в
 * useCabinetNav — пункту незачем знать, чем переход отличается от «открыть
 * в новом окне».
 */
defineProps<{ item: CabinetNavItem }>()

const emit = defineEmits<{ select: [event: MouseEvent] }>()

const { t } = useI18n()
</script>

<template>
  <li
    class="vel-cabinet-nav__cell"
    :class="{ 'vel-cabinet-nav__cell--cta': item.id === 'support' }"
  >
    <a
      class="vel-cabinet-nav__link"
      :class="{
        'vel-cabinet-nav__link--active': item.active,
        'vel-cabinet-nav__link--cta': item.id === 'support',
      }"
      :href="item.href"
      :data-coach-tab="item.id"
      :aria-current="item.active ? 'page' : undefined"
      :aria-label="
        item.badge > 0
          ? `${item.label}. ${t('account.nav.unread', { count: item.badge })}`
          : undefined
      "
      @click="emit('select', $event)"
    >
      <span class="vel-cabinet-nav__icon-wrap">
        <VelCabinetIcon :kind="item.id" />
        <span
          v-if="item.badge > 0"
          class="vel-cabinet-nav__badge vel-num"
          aria-hidden="true"
          data-testid="support-badge"
        >
          {{ item.badge > 9 ? '9+' : item.badge }}
        </span>
      </span>
      <span class="vel-cabinet-nav__label">{{ item.label }}</span>
    </a>
  </li>
</template>

<style scoped>
/*
  Ячейка — корень компонента, поэтому её правила видны и отсюда, и из меню:
  у корневого узла атрибуты области видимости обоих файлов. Держим их здесь,
  вместе с остальным оформлением пункта, чтобы поля и разделители не пришлось
  искать в двух местах.
*/
.vel-cabinet-nav__cell {
  flex: 1 1 0;
  min-inline-size: 0;
}

/*
  «Assistenza» получает долю шире прочих, и это не про важность, а про
  арифметику. У неё самая длинная подпись (61px против 33 у «Home»), и
  она единственная нарисована пилюлей: круглые торцы съедают у текста ещё
  примерно по 8px с каждой стороны. При равных долях на 320px подпись
  вылезала на края заливки и читалась как обрезанная — замерено, запас был
  −8px. Забирая четверть доли у коротких соседей, получаем запас +8.
  Проверяется автоматически: scripts/audit-mobile.mjs.
*/
.vel-cabinet-nav__cell--cta {
  flex-grow: 1.3;
}

/*
  Пункт. Цель нажатия: 2.75rem — нижняя граница по WCAG 2.5.5; на узком экране
  ячейка выше (панель 4rem), и это тот случай, когда запас лучше минимума —
  по нижней панели попадают большим пальцем на ходу.
*/
.vel-cabinet-nav__link {
  --vel-icon-size: 1.35rem;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-block-size: 2.75rem;
  block-size: 100%;
  padding: 0.35rem 0.25rem;
  border-radius: var(--radius-panel);
  color: var(--color-muted);
  text-align: center;
  text-decoration: none;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.vel-cabinet-nav__icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Счётчик как на эталоне Calipso: кружок поверх иконки Assistenza. */
.vel-cabinet-nav__badge {
  position: absolute;
  top: -0.35rem;
  inset-inline-end: -0.55rem;
  min-inline-size: 1.05rem;
  padding: 0.05rem 0.28rem;
  border-radius: var(--radius-round);
  background-color: var(--color-danger);
  color: var(--color-accent-ink);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  box-shadow: 0 0 0 1.5px var(--color-surface);
}

.vel-cabinet-nav__link--cta .vel-cabinet-nav__badge {
  background-color: var(--color-accent-ink);
  color: var(--color-accent-deep);
  box-shadow: 0 0 0 1.5px var(--color-accent-deep);
}

.vel-cabinet-nav__label {
  display: block;
  max-inline-size: 100%;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Самый узкий телефон: подпись на шаг мельче, иначе «Documenti» и
   «Assistenza» упираются в края своих ячеек. 0.66rem — 10.6px, ниже
   границы читаемости мелкого текста интерфейса не опускаемся. */
@media (max-width: 22.5rem) {
  .vel-cabinet-nav__label {
    font-size: 0.66rem;
  }
}

.vel-cabinet-nav__link:hover {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-cabinet-nav__link:active {
  color: var(--color-accent-deep);
}

/*
  ОТКРЫТЫЙ РАЗДЕЛ на узком экране: подложки нет, красятся знак и подпись, и
  подпись становится полужирной. Жирность здесь не украшение — цвет в одиночку
  состояние нести не вправе (WCAG 1.4.1), а начертание видно и в монохроме.
  Скринридеру то же самое говорит aria-current="page".
*/
.vel-cabinet-nav__link--active {
  color: var(--color-accent);
}

.vel-cabinet-nav__link--active .vel-cabinet-nav__label {
  font-weight: 600;
}

.vel-cabinet-nav__link--active:hover {
  color: var(--color-accent-dim);
}

/*
  «Assistenza» — призыв к действию: залит всегда, независимо от того, открыт
  раздел или нет. Белое на accent-deep даёт 11.68 к норме 4.5.
*/
.vel-cabinet-nav__link--cta {
  border-radius: var(--radius-round);
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
}

.vel-cabinet-nav__link--cta .vel-cabinet-nav__label {
  font-weight: 600;
}

.vel-cabinet-nav__link--cta:hover,
.vel-cabinet-nav__link--cta:active {
  background-color: var(--color-accent-dim);
  color: var(--color-accent-ink);
}

/* Открытый CTA: кольцо внутрь заливки. Без него «всегда подсвечен» съедал бы
   единственный видимый признак того, что человек сейчас именно здесь. */
.vel-cabinet-nav__link--cta.vel-cabinet-nav__link--active {
  box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--color-accent-ink) 75%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .vel-cabinet-nav__link {
    transition: none;
  }
}

/*
  ШИРОКИЙ ЭКРАН — пункт в колонке слева: знак и подпись встают в строку, места
  хватает и на разделители между смысловыми группами.
*/
@media (min-width: 64rem) {
  .vel-cabinet-nav__link {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.75rem;
    padding-inline: 0.75rem;
    text-align: start;
  }

  .vel-cabinet-nav__label {
    font-size: 0.9rem;
  }

  /* Разделитель после «Home»: в эталоне первый пункт отбит от остальных
     линией — он про экран целиком, остальные три про его части. */
  .vel-cabinet-nav__cell:first-child {
    margin-block-end: 0.55rem;
    padding-block-end: 0.55rem;
    border-block-end: 1px solid var(--color-line);
  }

  .vel-cabinet-nav__cell--cta {
    margin-block-start: 0.55rem;
  }

  /*
    На колонке активный пункт залит целиком: места хватает, и заливка читается
    быстрее, чем перекраска знака. Подпись остаётся полужирной — признак
    состояния обязан пережить монохром.

    ЗАЛИВКА ИМЕННО accent, А НЕ accent-deep. Здесь стоял accent-deep — ровно
    тот же цвет, которым всегда залит призыв «Assistenza». Замерено: у
    открытого раздела и у CTA совпадали и фон rgb(18,48,110), и цвет текста,
    различались они только скруглением. На экране это читалось как ДВА
    выбранных пункта сразу, и вопрос «где я сейчас» оставался без ответа.

    Теперь признаков два и они независимы: открытый раздел — светлее (accent,
    белое на нём даёт 6.64 при норме 4.5), призыв — темнее (accent-deep, 11.68)
    и круглый. Различить их можно и по цвету, и по форме — второе важно, потому
    что при дальтонизме два синих одного тона неразличимы (WCAG 1.4.1).
  */
  .vel-cabinet-nav__link--active:not(.vel-cabinet-nav__link--cta) {
    background-color: var(--color-accent);
    color: var(--color-accent-ink);
  }

  .vel-cabinet-nav__link--active:not(.vel-cabinet-nav__link--cta):hover {
    background-color: var(--color-accent-dim);
    color: var(--color-accent-ink);
  }

  .vel-cabinet-nav__link--active .vel-cabinet-nav__label {
    font-weight: 600;
  }
}
</style>
