<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelFaqItem from '@/sections/VelFaqItem.vue'

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
      <!-- Снимок из шапки убран по просьбе заказчика, вместе с ним ушла и сетка
           в две колонки: без правой ячейки она оставляла бы справа пустое поле
           в 22rem.
           Заголовок ведёт своё появление сам (слова лесенкой), поэтому лежит
           вне обёртки: подробности в шапке VelSplitHeading. -->
      <div class="flex max-w-3xl flex-col gap-3">
        <VelReveal as="p" class="vel-label">{{ t('faq.label') }}</VelReveal>

        <VelSplitHeading :lines="[{ text: t('faq.title') }]" class="text-3xl sm:text-4xl" />
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
