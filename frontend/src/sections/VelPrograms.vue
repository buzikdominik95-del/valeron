<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelProgramCard from '@/sections/VelProgramCard.vue'
import guaranteePhoto from '@/img/garanzia-approvata.webp'
import officePhoto from '@/img/ufficio-open-space.webp'
import approvedPhoto from '@/img/cliente-approvata.webp'
import expertPhoto from '@/img/consulente-tablet.webp'

const { t } = useI18n()

/**
 * Снимок к каждой карточке. Импортом, а не строкой пути: сборщик подставит
 * хеш имени и сам уронит сборку, если файл переименуют или потеряют, — строка
 * же тихо превратилась бы в битую картинку на витрине.
 *
 * garanzia-approvata стоит у «Credito preferenziale» ПО ПРЯМОЙ ПРОСЬБЕ, и это
 * тот же кадр, что в крупной врезке шапки секции двумя блоками выше. То есть
 * на одном экране он виден дважды. Выбор сделан осознанно и менять его молча
 * не надо; если дубль однажды начнёт мешать, чинится он не здесь, а в шапке:
 * врезке отдаётся любой свободный кадр (например consulente-scrivania,
 * который эта перестановка как раз освободила).
 */
const PROGRAM_PHOTOS: Record<string, string> = {
  grants: officePhoto,
  rate: guaranteePhoto,
  guarantor: approvedPhoto,
  patents: expertPhoto,
}

/** Порядок карточек держим здесь, а не в локали: tm() отдаёт нетипизированный
    результат и не проходит vue-tsc в strict-режиме. */
const PROGRAM_KEYS = ['grants', 'rate', 'guarantor', 'patents'] as const

const programs = computed(() =>
  PROGRAM_KEYS.map((key) => ({
    key,
    title: t(`programs.items.${key}.title`),
    text: t(`programs.items.${key}.text`),
    photo: PROGRAM_PHOTOS[key] ?? '',
  })),
)
</script>

<template>
  <!-- Сцена секции: заголовок, снимок и четыре карточки — одна пачка,
       выезжают лесенкой в порядке чтения. См. VelStage. -->
  <VelStage class="border-b border-line">
    <!-- gap-10 вместо gap-9: 36px не лежат на шаге ритма, см. main.css -->
    <div class="vel-section mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 lg:gap-12">
      <!-- Снимок из шапки убран по просьбе заказчика, вместе с ним ушла и сетка
           в две колонки: без правой ячейки она оставляла бы справа пустое поле
           в 24rem. Сам кадр никуда не делся — он теперь на второй карточке.
           Надзаголовок и заголовок разведены по разным анимациям намеренно:
           заголовок выходит словами лесенкой и ведёт себя сам, а обёртка
           появления вокруг него дала бы вторую прозрачность поверх первой —
           две анимации на одни пиксели перемножаются. Подробности в шапке
           VelSplitHeading. -->
      <div class="flex flex-col gap-3">
        <VelReveal as="p" class="vel-label">{{ t('programs.label') }}</VelReveal>

        <VelSplitHeading
          :lines="[{ text: t('programs.title') }]"
          class="max-w-3xl text-3xl sm:text-4xl"
        />
      </div>

      <!-- role="list" возвращает семантику списка в Safari: preflight снимает
           маркеры, а вместе с ними VoiceOver теряет и роль.
           .vel-depth даёт перспективу для наклона карточек: без неё поворот
           вокруг горизонтальной оси свёлся бы к вертикальному сжатию -->
      <!--
        Desktop: grid 2/4.
        Mobile: горизонтальный «слайдер» (snap) — как на референсе Calipso.
      -->
      <ul
        role="list"
        class="vel-depth vel-programs-track flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:snap-none lg:grid-cols-4"
      >
        <!-- as="li": обёртка обязана остаться прямым ребёнком <ul>,
             иначе рушатся и разметка списка, и ячейки grid.
             Поэтому <li> остаётся здесь, а VelProgramCard отдаёт только
             содержимое ячейки — подробности в шапке того файла.
             tilt: карточка выходит из глубины, а не просто всплывает —
             шесть градусов наклона выпрямляются вместе с подъёмом -->
        <!--
          overflow-hidden и снятый p-6 — из-за снимка в карточке. Он идёт от
          края до края ячейки, поэтому общее поле уехало внутрь, на колонку с
          текстом (см. VelProgramCard), а обрезка прижимает верхние углы
          картинки к скруглению рамки: без неё прямой угол снимка торчал бы
          из скруглённого угла ячейки.
        -->
        <VelReveal
          v-for="program in programs"
          :key="program.key"
          as="li"
          tilt
          class="vel-programs__card flex flex-col overflow-hidden rounded-panel border border-line bg-surface"
        >
          <VelProgramCard
            :title="program.title"
            :text="program.text"
            :photo="program.photo"
          />
        </VelReveal>
      </ul>
    </div>
  </VelStage>
</template>

<style scoped>
/* Mobile slider: карточка ~85% ширины, snap-center */
.vel-programs-track {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  margin-inline: -1.25rem;
  padding-inline: 1.25rem;
}

@media (max-width: 639px) {
  .vel-programs__card {
    flex: 0 0 min(85vw, 20rem);
    scroll-snap-align: center;
  }
}

@media (min-width: 640px) {
  .vel-programs-track {
    margin-inline: 0;
    padding-inline: 0;
  }
}

/*
  ОТКЛИК КАРТОЧКИ НА НАВЕДЕНИЕ.

  TRANSFORM У САМОЙ КАРТОЧКИ НЕ ТРОГАЕМ, и это главное ограничение здесь.
  Ячейкой заведует VelReveal: появление с наклоном он делает через GSAP, а тот
  пишет transform ИНЛАЙНОМ. Инлайновое свойство сильнее любого правила из
  таблицы, поэтому «приподнять карточку» на hover просто не сработало бы после
  того, как отыграет появление, — и сломалось бы молча, без ошибки в консоли.

  Поэтому подъём показан тем, чего GSAP не касается: рамка набирает акцент,
  под карточкой появляется тень, а снимок внутри чуть наезжает. Снимок — не
  ячейка, его transform свободен.

  Тень и рамка меняются вместе: одна рамка читается как выделение, одна тень —
  как отрыв от страницы; вдвоём получается «карточка подалась навстречу».

  @media (hover: hover) обязателен: на тач-экране :hover прилипает после тапа,
  и карточка осталась бы подсвеченной до перезагрузки страницы.
*/
@media (hover: hover) {
  .vel-programs__card {
    transition:
      border-color 260ms ease,
      box-shadow 260ms ease;
  }

  .vel-programs__card:hover {
    border-color: var(--color-accent);
    box-shadow: 0 0.75rem 1.75rem color-mix(in oklab, var(--color-fg) 12%, transparent);
  }

  /* :deep обязателен: снимок живёт в разметке VelProgramCard, и без него
     правило получило бы атрибут области видимости этой секции, которого на
     чужом узле нет. */
  .vel-programs__card:hover :deep(.vel-program__photo) {
    transform: scale(1.045);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Наезд снимка снимаем, рамку и тень оставляем: это смена состояния, а не
     движение, и от неё не укачивает. */
  .vel-programs__card:hover :deep(.vel-program__photo) {
    transform: none;
  }
}
</style>
