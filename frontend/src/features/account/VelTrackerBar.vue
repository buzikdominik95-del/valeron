<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTrackerBar } from '@/composables/useTrackerBar'
import VelTrackerRow from '@/features/account/VelTrackerRow.vue'
import VelTrackerMini from '@/features/account/VelTrackerMini.vue'

/**
 * Полоса шагов в шапке кабинета: «Passo 4 di 5» и пять кружков с линией.
 *
 * КАРКАС И НАЧИНКА РАЗДЕЛЕНЫ. Здесь — корень полосы, строка-счётчик и всё
 * поведение при сжатии; ряд кружков с дорожкой и лучом живёт в VelTrackerRow,
 * короткая полоса телефонного вида — в VelTrackerMini, а подписи, доля
 * заливки и переходы по шагам — в композабле useTrackerBar. Классы при этом
 * остались vel-track__… : это по-прежнему элементы одного блока, переезд
 * чисто файловый, в DOM не поменялось ничего. Переименование сломало бы
 * внешние проверки — по классам полосы ходит scripts/audit-mobile.mjs.
 *
 * ПЕРЕМЕННЫЕ ПОЛОСЫ ЖИВУТ НА ЭТОМ КОРНЕ. Долю заливки читают двое — линия
 * под кружками и короткая полоса сжатого вида, — а друг другу они не
 * потомки; общий предок у них ровно один, и это корень полосы.
 */
/**
 * СЖАТЫЙ ВИД включает шапка при прокрутке (см. useHeaderCondense): полоса
 * теряет строку-счётчик и подписи, кружки мельчают, и вся она встаёт в
 * просвет между логотипом и блоком пользователя. Это проп, а не собственное
 * чтение прокрутки: решение про сжатие принимает шапка целиком, и второй
 * наблюдатель за той же величиной разошёлся бы с ней на кадр.
 */
withDefaults(defineProps<{ condensed?: boolean }>(), { condensed: false })

const { t } = useI18n()

/* Корень заводится здесь, а не в композабле: на него смотрит `ref="root"` в
   шаблоне, а такую привязку компонент обязан держать у себя. */
const root = ref<HTMLElement | null>(null)

const { total, doneCount, allDone, counterText, currentIndexLabel, items, onActivate } =
  useTrackerBar(root)
</script>

<template>
  <nav
    ref="root"
    class="vel-track"
    :class="{ 'vel-track--tight': condensed }"
    :aria-label="t('account.tracker.label')"
  >
    <div class="vel-track__meta">
      <p class="vel-track__lead">
        {{
          allDone
            ? t('account.progress.allDone')
            : t('account.tracker.current', { index: currentIndexLabel, total })
        }}
      </p>
      <p class="vel-num vel-track__count" aria-hidden="true">{{ counterText }}</p>
    </div>

    <VelTrackerRow :items="items" :all-done="allDone" @activate="onActivate" />

    <!-- Сжатый вид на телефоне: вместо пяти кружков короткая полоса со счётом.
         Почему именно так — в шапке VelTrackerMini. -->
    <VelTrackerMini :done="doneCount" :total="total" />
  </nav>
</template>

<style scoped>
.vel-track {
  /* Число шагов — на корне: его читают и ряд кружков, и короткая полоса
     сжатого вида. Настоящее значение приходит из скрипта, здесь запасное. */
  --vel-track-count: 5;

  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-block: 0.6rem 0.7rem;
  /* Как и у остальных полос кабинета: не меньше 0.875rem и не меньше бокового
     выреза — с viewport-fit=cover окно доходит до края стекла. */
  padding-inline:
    max(0.875rem, env(safe-area-inset-left))
    max(0.875rem, env(safe-area-inset-right));
  border-block-end: 1px solid var(--color-line);
  background-color: var(--color-surface);
}

.vel-track__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.2rem 1rem;
}

.vel-track__lead {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
}

.vel-track__count {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.73rem;
  font-weight: 600;
}

/*
  ==================== СЖАТЫЙ ВИД ====================

  Шапка сжимается при прокрутке, и полоса шагов вместе с ней: пропадают
  строка-счётчик и подписи, кружки мельчают, поля сходят почти на нет. Высота
  шапки падает со 160px примерно до 56 — на телефоне это четверть экрана,
  возвращённая содержимому.

  ПЕРЕХОДЫ ПО ЯВНОМУ СПИСКУ СВОЙСТВ, а не по all: с all браузер анимирует и
  цвет, и тень, и заливку кружков, и переключение шага (пройден → текущий)
  превращается в медленное перетекание вместо мгновенной смены состояния.
*/
.vel-track,
.vel-track__meta,
.vel-track__row {
  /*
    Одна кривая и одна длительность на всё, что схлопывается: высоты строки
    счётчика, ряда кружков и поля самой полосы. Разойдясь по времени, они
    превращают сжатие в три отдельных подёргивания вместо одного движения.

    280ms с ease-out: за это время глаз успевает проследить, куда уехали
    шаги, и не начинает ждать. Кривая с быстрым началом — шапка отзывается
    на прокрутку сразу, а тормозит уже в конце.
  */
  transition:
    block-size 280ms cubic-bezier(0.22, 1, 0.36, 1),
    padding-block 280ms cubic-bezier(0.22, 1, 0.36, 1),
    margin-block 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease-out;
}

.vel-track--tight {
  padding-block: 0;
  padding-inline: 0;
  border-block-end: 0;
  background-color: transparent;
  gap: 0;
}

/*
  Строка-счётчик уходит из потока по высоте, а не по display: none —
  сворачивание высоты можно анимировать, а появление/исчезновение элемента
  нет, и шапка прыгала бы рывком.
*/
.vel-track--tight .vel-track__meta {
  overflow: hidden;
  /* И ширину тоже в ноль, не только высоту. Схлопнув одну высоту, строка
     остаётся невидимой, но ПРОДОЛЖАЕТ занимать ширину по своему тексту —
     замерено: полоса раздувалась до 176px вместо 85, блок пользователя
     переставал помещаться в строку и переносился вниз. */
  inline-size: 0;
  block-size: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .vel-track,
  .vel-track__meta,
  .vel-track__row {
    transition: none;
  }
}

@media (min-width: 64rem) {
  .vel-track {
    padding-inline: 1.5rem;
  }

  .vel-track__lead {
    font-size: 0.85rem;
  }
}
</style>
