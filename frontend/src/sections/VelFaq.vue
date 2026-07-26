<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelPhoto from '@/components/ui/VelPhoto.vue'
import VelFaqItem from '@/sections/VelFaqItem.vue'
import expertPhoto from '@/img/consulente-tablet.webp'

const { t } = useI18n()

/**
 * Порядок и состав вопросов задаются здесь, а не в локали: локальный кортеж
 * ключей типизируется сам, тогда как tm() в strict-режиме отдаёт unknown
 * и требует ручного приведения типов на каждом обращении.
 */
const ITEM_KEYS = [
  'rate',
  'blacklist',
  'speed',
  'banks',
  'scoring',
  'digital',
  'fees',
  'upfront',
] as const

const items = computed(() =>
  ITEM_KEYS.map((key, index) => ({
    key,
    // Нумерация чисто декоративная, поэтому её не держат строки локали
    number: String(index + 1).padStart(2, '0'),
    question: t(`faq.items.${key}.q`),
    answer: t(`faq.items.${key}.a`),
  })),
)
</script>

<template>
  <!-- Сцена секции. Восемь вопросов в кадре разом — не беда: ScrollTrigger.batch
       режет пачку по шесть, и лесенка в каждой начинается заново, вместо того
       чтобы растянуться на секунду от первого вопроса до последнего -->
  <VelStage id="faq" class="border-b border-line">
    <div class="vel-section mx-auto w-full max-w-6xl px-5">
      <!-- gap-10 вместо gap-9: 36px не лежат на шаге ритма, см. main.css -->
      <div class="grid items-end gap-10 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-16">
        <!-- Заголовок ведёт своё появление сам (слова лесенкой), поэтому лежит
             вне обёртки: подробности в шапке VelSplitHeading -->
        <div class="flex max-w-3xl flex-col gap-3">
          <VelReveal as="p" class="vel-label">{{ t('faq.label') }}</VelReveal>

          <VelSplitHeading :lines="[{ text: t('faq.title') }]" class="text-3xl sm:text-4xl" />
        </div>

        <VelReveal>
          <VelPhoto
            bleed="start"
            :src="expertPhoto"
            :alt="t('photo.expert')"
            :width="1248"
            :height="832"
          />
        </VelReveal>
      </div>

      <ul class="mt-10 border-t border-line lg:mt-12">
        <!-- as="li": строка остаётся прямым ребёнком <ul>.
             Раскрытый ответ не «схлопывается» — анимация трогает только
             прозрачность, а focus-within снимает её при переходе с клавиатуры -->
        <VelReveal v-for="item in items" :key="item.key" as="li" class="border-b border-line">
          <VelFaqItem :number="item.number" :question="item.question" :answer="item.answer" />
        </VelReveal>
      </ul>
    </div>
  </VelStage>
</template>
