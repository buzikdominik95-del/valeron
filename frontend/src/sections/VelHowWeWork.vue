<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelPhoto from '@/components/ui/VelPhoto.vue'
import VelWorkStep from '@/sections/VelWorkStep.vue'
import advisorPhoto from '@/img/consulente-scrivania.webp'

const { t } = useI18n()

/**
 * Порядок здесь — настоящая последовательность: заявка → защита → ставка,
 * поэтому список нумерованный.
 *
 * Ключи держим локальным кортежем и зовём t() на каждый: tm() в strict-режиме
 * отдаёт union сообщений, который пришлось бы приводить руками.
 */
const STEP_KEYS = ['form', 'shield', 'rate'] as const

const steps = computed(() =>
  STEP_KEYS.map((key, index) => ({
    key,
    // Номер — позиционный маркер, а не текст: он одинаков в обеих локалях,
    // поэтому считается по индексу, а не дублируется в файле строк.
    number: String(index + 1).padStart(2, '0'),
    title: t(`howWeWork.steps.${key}.title`),
    text: t(`howWeWork.steps.${key}.text`),
  })),
)
</script>

<template>
  <!-- Сцена секции: заголовок, снимок и три шага одной пачкой. Порядок шагов
       и есть смысл раздела, поэтому лесенка здесь читается как счёт: раз, два, три -->
  <VelStage class="border-b border-line">
    <div class="vel-section mx-auto w-full max-w-6xl px-5">
      <div class="grid items-end gap-10 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-16">
        <!-- Заголовок выходит словами лесенкой и ведёт себя сам, поэтому
             обёртки появления вокруг него нет — см. шапку VelSplitHeading -->
        <VelSplitHeading :lines="[{ text: t('howWeWork.title') }]" class="text-3xl sm:text-4xl" />

        <VelReveal>
          <VelPhoto
            bleed="start"
            :src="advisorPhoto"
            :alt="t('photo.advisor')"
            :width="1248"
            :height="832"
          />
        </VelReveal>
      </div>

      <!-- role="list" возвращает семантику списка в Safari: preflight снимает
           маркеры, а вместе с ними VoiceOver теряет и роль.
           .vel-depth даёт перспективу для наклона шагов.
           mt-10 вместо mt-9: 36px не лежат на шаге ритма, см. main.css -->
      <ol role="list" class="vel-depth mt-10 grid grid-cols-1 md:mt-12 md:grid-cols-3">
        <!-- as="li": шаги обязаны остаться прямыми детьми <ol>,
             иначе список теряет и семантику, и колонки grid.
             Поэтому <li> и разделители остаются здесь — они зависят от позиции
             в списке, — а VelWorkStep отдаёт только содержимое шага.
             tilt: шаг выходит из глубины — то же движение, что у карточек
             программ, потому что это те же плитки в сетке.
             py-8 вместо py-7: 28px не лежат на шаге ритма -->
        <VelReveal
          v-for="(step, index) in steps"
          :key="step.key"
          as="li"
          tilt
          class="flex flex-col items-start gap-3 border-line py-8 pr-4"
          :class="index > 0 ? 'border-t md:border-t-0 md:border-l md:pl-6' : ''"
        >
          <VelWorkStep :number="step.number" :title="step.title" :text="step.text" />
        </VelReveal>
      </ol>

      <!-- Строка «Более 50 банков-партнёров» отсюда убрана: она стала
           заголовком отдельной секции @/sections/VelBankStrip.vue, которая
           идёт сразу следом. Дважды подряд один и тот же текст не нужен. -->
    </div>
  </VelStage>
</template>
