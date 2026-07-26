<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'

/**
 * Миссия и аккредитация. Строки лежат в @/locales/sections/mission.ts
 * и подключены под префиксом 'mission.'.
 */
const { t } = useI18n()
</script>

<template>
  <!-- Сцена секции: надзаголовок → заголовок → лид → плашка → правая колонка.
       Отставание считает stagger по порядку в разметке, то есть по порядку чтения -->
  <VelStage class="border-b border-line">
    <div
      class="vel-section mx-auto grid w-full max-w-6xl gap-10 px-5 lg:grid-cols-[1.05fr_minmax(0,24rem)] lg:gap-16"
    >
      <div class="flex flex-col items-start gap-6">
        <VelReveal as="p" class="vel-label">{{ t('mission.label') }}</VelReveal>

        <!-- Заголовок ведёт своё появление сам (слова лесенкой), поэтому лежит
             вне обёртки: подробности в шапке VelSplitHeading -->
        <VelSplitHeading
          :lines="[{ text: t('mission.title') }]"
          class="text-3xl sm:text-4xl lg:text-5xl"
        />

        <!-- .vel-measure вместо max-w-2xl: замер на 1280 — 86 знаков в строке -->
        <VelReveal as="p" class="vel-measure text-muted">
          {{ t('mission.lead') }}
        </VelReveal>

        <!-- Плашка аккредитации: вместо иконки — надзаголовок и рамка контрола,
             так блок читается строже и не выпадает из гарнитуры -->
        <VelReveal
          class="mt-2 flex w-full flex-col gap-4 rounded-panel border border-line-strong bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div class="flex items-start gap-3">
            <span class="mt-2 size-1.5 shrink-0 bg-accent" aria-hidden="true"></span>

            <dl class="flex flex-col gap-1">
              <dt class="vel-label">{{ t('mission.accreditationLabel') }}</dt>
              <dd class="m-0 text-sm font-semibold text-fg">{{ t('mission.accreditation') }}</dd>
            </dl>
          </div>

          <!-- href="#" — заглушка до появления страницы с лицензией -->
          <a
            href="#"
            class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-line-strong px-3.5 text-xs font-semibold text-accent transition-colors duration-150 hover:border-accent hover:bg-raised active:border-accent active:bg-accent active:text-accent-ink"
          >
            {{ t('mission.license') }}
            <span aria-hidden="true">→</span>
          </a>
        </VelReveal>
      </div>

      <!-- Вторая часть отбита линией: сбоку на широком экране
           и сверху, когда колонки схлопываются в одну -->
      <VelReveal
        class="flex flex-col gap-4 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16"
      >
        <!-- Снимок отсюда убран по просьбе заказчика. Колонка при этом остаётся
             и сетку не теряет: под снимком с самого начала лежал собственный
             текст раздела — надзаголовок, заголовок и абзац про роль. -->
        <p class="vel-label">{{ t('mission.roleLabel') }}</p>

        <h3 class="text-xl sm:text-2xl">{{ t('mission.roleTitle') }}</h3>

        <!-- .vel-measure: колонка узкая только на lg. На 768, где сетка складывается
             в одну колонку, абзац разгонялся до 110 знаков в строке. -->
        <p class="vel-measure text-sm text-muted">{{ t('mission.roleText') }}</p>
      </VelReveal>
    </div>
  </VelStage>
</template>
