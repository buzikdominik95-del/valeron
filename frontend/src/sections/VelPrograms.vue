<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelPhoto from '@/components/ui/VelPhoto.vue'
import VelProgramCard from '@/sections/VelProgramCard.vue'
import guaranteePhoto from '@/img/garanzia-approvata.webp'

const { t } = useI18n()

/** Порядок карточек держим здесь, а не в локали: tm() отдаёт нетипизированный
    результат и не проходит vue-tsc в strict-режиме. */
const PROGRAM_KEYS = ['grants', 'rate', 'guarantor', 'patents'] as const

const programs = computed(() =>
  PROGRAM_KEYS.map((key) => ({
    key,
    title: t(`programs.items.${key}.title`),
    text: t(`programs.items.${key}.text`),
  })),
)
</script>

<template>
  <!-- Сцена секции: заголовок, снимок и четыре карточки — одна пачка,
       выезжают лесенкой в порядке чтения. См. VelStage. -->
  <VelStage class="border-b border-line">
    <!-- gap-10 вместо gap-9: 36px не лежат на шаге ритма, см. main.css -->
    <div class="vel-section mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 lg:gap-12">
      <div class="grid items-end gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-16">
        <!-- Надзаголовок и заголовок разведены по разным анимациям намеренно:
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

        <VelReveal>
          <VelPhoto
            bleed="start"
            :src="guaranteePhoto"
            :alt="t('photo.guarantee')"
            :width="1248"
            :height="832"
          />
        </VelReveal>
      </div>

      <!-- role="list" возвращает семантику списка в Safari: preflight снимает
           маркеры, а вместе с ними VoiceOver теряет и роль.
           .vel-depth даёт перспективу для наклона карточек: без неё поворот
           вокруг горизонтальной оси свёлся бы к вертикальному сжатию -->
      <ul role="list" class="vel-depth grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- as="li": обёртка обязана остаться прямым ребёнком <ul>,
             иначе рушатся и разметка списка, и ячейки grid.
             Поэтому <li> остаётся здесь, а VelProgramCard отдаёт только
             содержимое ячейки — подробности в шапке того файла.
             tilt: карточка выходит из глубины, а не просто всплывает —
             шесть градусов наклона выпрямляются вместе с подъёмом -->
        <VelReveal
          v-for="program in programs"
          :key="program.key"
          as="li"
          tilt
          class="flex flex-col gap-3 rounded-panel border border-line bg-surface p-6"
        >
          <VelProgramCard :title="program.title" :text="program.text" />
        </VelReveal>
      </ul>
    </div>
  </VelStage>
</template>
